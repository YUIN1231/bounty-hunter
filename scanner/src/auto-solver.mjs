/**
 * Auto-Solver: GitHub issue → fork → Claude writes fix → PR created
 * No human involvement needed after initial setup.
 */
import { execSync, spawnSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, extname } from "path";
import { tmpdir } from "os";
import { client } from "./claude-client.mjs";
import { CONFIG } from "./config.mjs";

// Lazy: resolved on first use to avoid blocking module load if gh CLI has TLS issues
let _GH_USER = null;
async function getGhUser() {
  if (_GH_USER) return _GH_USER;
  // Try gh CLI first, fall back to GitHub API via Node fetch
  try {
    _GH_USER = execSync("gh api user --jq .login", { encoding: "utf8", timeout: 8000 }).trim();
  } catch {
    const tok = process.env.GITHUB_TOKEN;
    if (!tok) throw new Error("No GITHUB_TOKEN and gh CLI unavailable");
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" },
    });
    const data = await res.json();
    _GH_USER = data.login;
  }
  return _GH_USER;
}

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".rb", ".php",
  ".json", ".yaml", ".yml", ".toml", ".md",
  ".css", ".scss", ".html",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_BUF = 50 * 1024 * 1024; // 50 MB

function sh(cmd, cwd, silent = true) {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: silent ? "pipe" : "inherit", maxBuffer: MAX_BUF }).trim();
}

function shSafe(cmd, cwd) {
  const res = spawnSync(cmd, { cwd, shell: true, encoding: "utf8", maxBuffer: MAX_BUF });
  return { ok: res.status === 0, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function listRepoFiles(dir, maxFiles = 200) {
  const result = sh("git ls-files", dir);
  return result.split("\n").filter((f) => {
    const ext = extname(f).toLowerCase();
    return CODE_EXTENSIONS.has(ext) && !f.includes("node_modules") && !f.includes(".lock");
  }).slice(0, maxFiles);
}

function readFile(dir, relPath) {
  try {
    const content = readFileSync(join(dir, relPath), "utf8");
    return content.slice(0, 6000); // cap each file at 6k chars
  } catch {
    return null;
  }
}

// ── Step 1: Identify relevant files ──────────────────────────────────────────

async function identifyRelevantFiles(allFiles, issue) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Given this GitHub issue, which 3 files are most likely to need changes?
Return exactly 3 file paths as JSON array.

ISSUE TITLE: ${issue.title}
ISSUE BODY: ${(issue.body || "").slice(0, 800)}

ALL FILES IN REPO:
${allFiles.slice(0, 150).join("\n")}

Respond with ONLY a JSON array: ["path/to/file.ts", ...]`,
    }],
  });
  try {
    return JSON.parse(res.content[0].text.match(/\[[\s\S]+\]/)[0]);
  } catch {
    return allFiles.slice(0, 3);
  }
}

// ── Step 2: Claude generates the fix ─────────────────────────────────────────

async function generateFix(issue, fileContents, job) {
  // Keep context small: 3 files max, 2500 chars each
  const topFiles = Object.entries(fileContents).slice(0, 3);
  const filesSection = topFiles
    .map(([path, content]) => `=== ${path} ===\n${content.slice(0, 2500)}`)
    .join("\n\n");

  process.stdout.write("    Generating");
  let fullText = "";

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `Implement a fix for this GitHub bounty issue. Be minimal and precise.

ISSUE #${issue.number}: ${issue.title}
BOUNTY: $${job.budget}
DESCRIPTION: ${(issue.body || "").slice(0, 500)}

CODE FILES:
${filesSection}

Return ONLY valid JSON (no markdown):
{
  "files": {"relative/path/file.ts": "COMPLETE file content with fix applied"},
  "commitMessage": "fix: brief description",
  "prTitle": "fix: brief title under 72 chars",
  "prBody": "Implements fix for #${issue.number}.\\n\\nCloses #${issue.number}"
}`,
    }],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
      fullText += chunk.delta.text;
      process.stdout.write(".");
    }
  }
  console.log(" done");

  const match = fullText.trim().match(/\{[\s\S]+\}/);
  if (!match) throw new Error(`Bad response: ${fullText.slice(0, 100)}`);
  return JSON.parse(match[0]);
}

// ── Step 3: Validate the fix compiles ─────────────────────────────────────────

function validateFix(dir, testCommand) {
  // TypeScript check
  const hasTsConfig = existsSync(join(dir, "tsconfig.json"));
  if (hasTsConfig) {
    const { ok, stderr } = shSafe("npx tsc --noEmit 2>&1 || true", dir);
    const errors = (stderr || "").split("\n").filter((l) => l.includes("error TS")).length;
    if (errors > 0) return { ok: false, reason: `TypeScript: ${errors} errors` };
  }

  // Run tests if available
  if (testCommand && testCommand !== "null") {
    const { ok } = shSafe(testCommand, dir);
    if (!ok) return { ok: false, reason: `Tests failed: ${testCommand}` };
  }

  return { ok: true };
}

// ── Main auto-solve function ──────────────────────────────────────────────────

export async function autoSolve(job) {
  const match = job.url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) throw new Error(`Cannot parse GitHub URL: ${job.url}`);
  const [, owner, repo, issueNumStr] = match;
  const issueNum = parseInt(issueNumStr);
  const branchName = `bounty-issue-${issueNum}-${Date.now()}`;
  const tmpDir = mkdtempSync(join(tmpdir(), `bounty-${repo}-`));

  console.log(`\n  Repo: ${owner}/${repo}  Issue: #${issueNum}  Bounty: $${job.budget}`);

  // 1. Fork the repo
  console.log(`  Forking...`);
  try {
    sh(`gh repo fork ${owner}/${repo} --clone=false --default-branch-only`);
  } catch {
    // Already forked is fine
  }

  // 2. Clone the fork (sparse + depth 1 to handle large repos)
  console.log(`  Cloning fork...`);
  mkdirSync(tmpDir, { recursive: true });
  sh(`git init`, tmpDir);
  const GH_USER = await getGhUser();
  sh(`git remote add origin https://github.com/${GH_USER}/${repo}`, tmpDir);
  sh(`git config core.sparseCheckout true`, tmpDir);
  // Allow all files initially, we'll read selectively
  writeFileSync(join(tmpDir, ".git", "info", "sparse-checkout"), "/*\n", "utf8");
  sh(`git fetch --depth 1 origin HEAD`, tmpDir);
  sh(`git checkout FETCH_HEAD`, tmpDir);
  sh(`git config user.name "${CONFIG.profile.name}"`, tmpDir);
  sh(`git config user.email "yuin.yoshizawa@gmail.com"`, tmpDir);
  sh(`git checkout -b ${branchName}`, tmpDir);

  // 3. Get full issue from API
  console.log(`  Reading issue...`);
  const issueData = JSON.parse(
    sh(`gh api repos/${owner}/${repo}/issues/${issueNum}`)
  );

  // 4. Identify relevant files
  const allFiles = listRepoFiles(tmpDir);
  console.log(`  Repo has ${allFiles.length} code files. Identifying relevant ones...`);
  const relevantFiles = await identifyRelevantFiles(allFiles, issueData);
  console.log(`  Relevant: ${relevantFiles.join(", ")}`);

  // 5. Read those files
  const fileContents = {};
  for (const f of relevantFiles) {
    const content = readFile(tmpDir, f);
    if (content) fileContents[f] = content;
  }

  // 6. Generate the fix
  console.log(`  Claude is writing the fix...`);
  const fix = await generateFix(issueData, fileContents, job);

  // 7. Apply files
  let filesChanged = 0;
  for (const [relPath, content] of Object.entries(fix.files || {})) {
    const fullPath = join(tmpDir, relPath);
    const dir = fullPath.split(/[/\\]/).slice(0, -1).join("\\");
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, "utf8");
    filesChanged++;
  }
  console.log(`  Applied ${filesChanged} file(s)`);

  // 8. Validate
  console.log(`  Validating...`);
  const validation = validateFix(tmpDir, fix.testCommand);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.reason}`);
  }

  // 9. Commit and push
  console.log(`  Committing and pushing...`);
  sh(`git add -A`, tmpDir);
  sh(`git commit -m "${fix.commitMessage}"`, tmpDir);
  sh(`git push origin ${branchName}`, tmpDir);

  // 10. Create PR — write body to temp file to avoid shell escaping issues
  console.log(`  Creating PR...`);
  const bodyFile = join(tmpDir, "_pr_body.md");
  writeFileSync(bodyFile, fix.prBody ?? `Fixes #${issueNum}`, "utf8");
  const prUrl = sh(
    `gh pr create --repo ${owner}/${repo} --title "${fix.prTitle.replace(/"/g, "'")}" --body-file "${bodyFile}" --head ${GH_USER}:${branchName}`,
    tmpDir
  );

  return {
    prUrl: prUrl.trim(),
    title: fix.prTitle,
    filesChanged,
    commit: fix.commitMessage,
    bounty: job.budget,
  };
}
