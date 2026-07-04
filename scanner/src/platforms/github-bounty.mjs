/**
 * GitHub Bounty Scanner 窶・targets REAL bounties only
 *
 * Strategy 0a: Algora website scraping (Playwright) 窶・verified company bounties
 * Strategy 1: algora-io[bot] commenter 竊・verified, company-backed
 * Strategy 2: label:bounty on repos with 500+ stars 竊・established OSS
 * Strategy 3: known bounty label patterns on reputable repos
 */
import { CONFIG } from "../config.mjs";

const GH_API = "https://api.github.com";

function ghHeaders() {
  const h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghGet(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403) throw new Error("GitHub rate limit hit");
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);
  return res.json();
}

async function getRepoStars(owner, repo) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}`);
    return { stars: data.stargazers_count ?? 0, language: data.language ?? "" };
  } catch {
    return { stars: 0, language: "" };
  }
}

async function getAlgoraBotAmount(owner, repo, issueNumber) {
  try {
    const comments = await ghGet(`${GH_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=20`);
    for (const c of comments) {
      if (c.user?.login !== "algora-io[bot]") continue;
      // Algora bot comment: "腸 $250 bounty 窶｢ ..."
      const m = c.body?.match(/\$\s*([\d,]+)/);
      if (m) return parseInt(m[1].replace(",", ""));
    }
  } catch {}
  return null;
}

function extractBountyAmount(title, body) {
  const text = `${title} ${body ?? ""}`;
  const matches = [...text.matchAll(/\$\s*([\d,]+)/g)];
  if (!matches.length) return null;
  const amounts = matches.map((m) => parseInt(m[1].replace(",", "")));
  return Math.max(...amounts.filter((n) => n >= 10 && n <= 50000));
}

// Repos that auto-reject or are known scam/fake bounty aggregators
const BLOCKED_OWNERS = new Set([
  "UnsafeLabs",
  "SecureBananaLabs",
  "Scottcjn",
  "kickama-prize-lab",
  "xevrion-v2",
]);

const TECH_KW = new Set([
  "javascript", "typescript", "node", "react", "next", "vue", "svelte",
  "playwright", "automation", "api", "web", "frontend", "backend",
  "llm", "ai", "openai", "anthropic", "claude", "chatgpt",
  "fullstack", "full-stack", "prisma", "graphql", "rest",
  "css", "html", "tailwind", "shadcn", "vite", "webpack",
  "express", "fastify", "hono", "bun", "deno",
]);

function isRelevant(issue, repoLanguage, owner) {
  if (BLOCKED_OWNERS.has(owner)) return false;
  const lang = (repoLanguage ?? "").toLowerCase();
  if (["php", "ruby", "go", "rust", "swift", "kotlin", "java", "c++", "c#"].includes(lang)) return false;
  const text = `${issue.title} ${issue.body ?? ""}`.toLowerCase();
  return [...TECH_KW].some((kw) => text.includes(kw)) || ["javascript", "typescript", ""].includes(lang);
}

// 笏笏 Strategy 0b: (placeholder 窶・Algora web requires login) 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
async function scanAlgoraWeb() {
  return []; // algora.io/bounties requires login 窶・use GitHub label search instead
}

// 笏笏 Strategy 0: Algora REST API 窶・highest quality, verified bounties 笏笏笏笏笏笏笏笏笏笏
async function scanAlgoraAPI() {
  const results = new Map();
  try {
    console.log(`  [GH/AlgoraAPI] Fetching open bounties from algora.io...`);
    const res = await fetch("https://algora.io/api/bounties?status=open&limit=50", {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Algora API ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.bounties ?? data.data ?? []);
    for (const b of items) {
      const issueUrl = b.issue_url ?? b.url ?? b.html_url;
      if (!issueUrl || !issueUrl.includes("github.com")) continue;
      const m = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
      if (!m) continue;
      const [, owner, repo, issueNum] = m;
      if (BLOCKED_OWNERS.has(owner)) continue;
      const { stars, language } = await getRepoStars(owner, repo);
      if (stars < 50) continue;
      const amount = b.amount ?? b.reward ?? b.reward_amount ?? 0;
      if (amount < 20) continue;
      results.set(issueUrl, {
        id: issueUrl,
        platform: "github",
        title: b.issue_title ?? b.title ?? `Bounty #${issueNum}`,
        url: issueUrl,
        repoUrl: `https://github.com/${owner}/${repo}`,
        description: (b.description ?? b.body ?? "").slice(0, 800),
        budget: amount,
        budgetText: `$${amount}`,
        skills: [],
        noInterview: true,
        stars,
        language,
        source: "algora-api",
        postedAt: b.created_at,
      });
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`    竊・${results.size} bounties from Algora API`);
  } catch (err) {
    console.warn(`    Algora API error: ${err.message}`);
  }
  return [...results.values()];
}

// 笏笏 Strategy 1: Algora bot 窶・highest quality 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
async function scanAlgora() {
  const results = new Map();
  const queries = [
    "commenter:algora-io[bot] is:open is:issue",
    "commenter:algora-io[bot] is:open is:issue label:bounty",
    "commenter:algora-io[bot] is:open is:issue label:bounty language:TypeScript",
    "commenter:algora-io[bot] is:open is:issue label:bounty language:JavaScript",
  ];
  for (const q of queries) {
    const url = `${GH_API}/search/issues?q=${encodeURIComponent(q)}&sort=created&per_page=30`;
    console.log(`  [GH/Algora] ${q.slice(0, 60)}...`);
    try {
      const data = await ghGet(url);
      for (const issue of data.items ?? []) {
        if (results.has(issue.html_url)) continue;
        const repoUrl = issue.repository_url;
        const [, owner, repo] = repoUrl.match(/repos\/([^/]+)\/([^/]+)$/) ?? [];
        if (!owner) continue;

        const { stars, language } = await getRepoStars(owner, repo);
        if (stars < 50) continue; // skip tiny repos
        if (!isRelevant(issue, language, owner)) continue;

        // Get actual bounty amount from Algora bot comment
        const amount = await getAlgoraBotAmount(owner, repo, issue.number)
          ?? extractBountyAmount(issue.title, issue.body);
        if (!amount || amount < 20) continue;

        results.set(issue.html_url, {
          id: issue.html_url,
          platform: "github",
          title: issue.title,
          url: issue.html_url,
          repoUrl: `https://github.com/${owner}/${repo}`,
          description: (issue.body ?? "").slice(0, 800),
          budget: amount,
          budgetText: `$${amount}`,
          skills: issue.labels.map((l) => l.name),
          noInterview: true,
          stars,
          language,
          source: "algora",
          postedAt: issue.created_at,
        });
        await new Promise((r) => setTimeout(r, 300));
      }
      console.log(`    竊・${results.size} Algora bounties so far`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`    Error: ${err.message}`);
    }
  }
  return [...results.values()];
}

// 笏笏 Strategy 2: High-star repos with bounty labels 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
async function scanHighStarBounties() {
  const results = new Map();
  const queries = [
    'label:bounty is:open is:issue stars:>500',
    'label:"good first issue" label:bounty is:open is:issue stars:>200',
    'label:bounty is:open is:issue language:TypeScript stars:>100',
    'label:bounty is:open is:issue language:JavaScript stars:>100',
    'label:bounty is:open is:issue language:TypeScript stars:>50 sort:created',
    'label:"funded" is:open is:issue language:TypeScript stars:>100',
    'label:"sponsored" is:open is:issue language:TypeScript stars:>100',
    'label:bounty is:open is:issue org:supabase',
    'label:bounty is:open is:issue org:calcom',
    'label:bounty is:open is:issue org:formbricks',
    'label:bounty is:open is:issue org:documenso',
    'label:bounty is:open is:issue org:vercel',
    'label:bounty is:open is:issue org:prisma',
    'label:bounty is:open is:issue org:trpc',
    'label:bounty is:open is:issue org:shadcn-ui',
    'label:bounty is:open is:issue org:tailwindlabs',
    'label:bounty is:open is:issue org:novuhq',
    'label:bounty is:open is:issue org:twentyhq',
    'label:bounty is:open is:issue org:makeplane',
    'label:bounty is:open is:issue org:airbytehq',
    'label:bounty is:open is:issue org:nocodb',
    'label:"腸 bounty" is:open is:issue language:TypeScript',
    'label:"algora" is:open is:issue language:TypeScript',
    'label:"hacktoberfest" label:bounty is:open is:issue language:TypeScript',
  ];
  for (const q of queries) {
    const url = `${GH_API}/search/issues?q=${encodeURIComponent(q)}&sort=created&per_page=20`;
    console.log(`  [GH/Stars] ${q.slice(0, 60)}...`);
    try {
      const data = await ghGet(url);
      for (const issue of data.items ?? []) {
        if (results.has(issue.html_url)) continue;
        const [, owner, repo] = (issue.repository_url ?? "").match(/repos\/([^/]+)\/([^/]+)$/) ?? [];
        if (!owner) continue;
        const { stars, language } = await getRepoStars(owner, repo);
        if (stars < 100) continue;
        if (!isRelevant(issue, language, owner)) continue;
        const amount = extractBountyAmount(issue.title, issue.body);
        if (!amount || amount < 20) continue;
        results.set(issue.html_url, {
          id: issue.html_url,
          platform: "github",
          title: issue.title,
          url: issue.html_url,
          repoUrl: `https://github.com/${owner}/${repo}`,
          description: (issue.body ?? "").slice(0, 800),
          budget: amount,
          budgetText: `$${amount}`,
          skills: issue.labels.map((l) => l.name),
          noInterview: true,
          stars,
          language,
          source: "stars",
          postedAt: issue.created_at,
        });
        await new Promise((r) => setTimeout(r, 200));
      }
      console.log(`    竊・${results.size} high-star bounties so far`);
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.warn(`    Error: ${err.message}`);
    }
  }
  return [...results.values()];
}

// 笏笏 Strategy 3: Dollar-amount labels 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
async function scanDollarLabels() {
  const results = new Map();
  const amounts = ["$500", "$250", "$200", "$150", "$100", "$75", "$50", "bounty:500", "bounty:250", "bounty:200", "bounty:100", "虫 Bounty", "Bounty"];
  for (const amt of amounts) {
    const q = `label:"${amt}" is:open is:issue`;
    const url = `${GH_API}/search/issues?q=${encodeURIComponent(q)}&sort=created&per_page=15`;
    console.log(`  [GH/Label] ${amt} bounties...`);
    try {
      const data = await ghGet(url);
      for (const issue of data.items ?? []) {
        if (results.has(issue.html_url)) continue;
        const [, owner, repo] = (issue.repository_url ?? "").match(/repos\/([^/]+)\/([^/]+)$/) ?? [];
        if (!owner) continue;
        const { stars, language } = await getRepoStars(owner, repo);
        if (stars < 50) continue;
        if (!isRelevant(issue, language, owner)) continue;
        // For non-dollar labels like "虫 Bounty", extract amount from issue body
      const rawAmt = parseInt(amt.replace(/[^0-9]/g, ""));
      const dollarAmt = rawAmt > 0 ? rawAmt : (extractBountyAmount(issue.title, issue.body) ?? 0);
      if (!dollarAmt || dollarAmt < 20) continue;
        results.set(issue.html_url, {
          id: issue.html_url,
          platform: "github",
          title: issue.title,
          url: issue.html_url,
          repoUrl: `https://github.com/${owner}/${repo}`,
          description: (issue.body ?? "").slice(0, 800),
          budget: dollarAmt,
          budgetText: amt,
          skills: issue.labels.map((l) => l.name),
          noInterview: true,
          stars,
          language,
          source: "dollar-label",
          postedAt: issue.created_at,
        });
        await new Promise((r) => setTimeout(r, 200));
      }
      console.log(`    竊・${results.size} dollar-label bounties so far`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`    Error: ${err.message}`);
    }
  }
  return [...results.values()];
}

// 笏笏 Main export 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
export async function scanGithubBounties() {
  console.log("  [GH] Scanning real bounties (Algora API + bot + high-star + labels)...");

  // Sequential to avoid GitHub rate-limit bursts (concurrent = 60/hr exhausted in seconds)
  const algoWeb = await scanAlgoraWeb().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e }));
  const algoraApi = await scanAlgoraAPI().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e }));
  const algora = await scanAlgora().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e }));
  const stars = await scanHighStarBounties().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e }));
  const labels = await scanDollarLabels().then(v => ({ status: "fulfilled", value: v })).catch(e => ({ status: "rejected", reason: e }));

  const all = new Map();
  for (const r of [algoWeb, algoraApi, algora, stars, labels]) {
    if (r.status === "fulfilled") {
      for (const j of r.value) {
        if (!all.has(j.id)) all.set(j.id, j);
      }
    }
  }

  const list = [...all.values()].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  console.log(`\n  [GH] Total real bounties: ${list.length} (${list.filter(j=>j.source==="algora-web").length} AlgoraWeb, ${list.filter(j=>j.source==="algora-api").length} AlgoraAPI, ${list.filter(j=>j.source==="algora").length} AlgoraBot, ${list.filter(j=>j.source==="stars").length} high-star, ${list.filter(j=>j.source==="dollar-label").length} dollar-label)`);
  return list;
}

