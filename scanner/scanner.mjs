#!/usr/bin/env node
import { execSync } from "child_process";

if (!process.env.GITHUB_TOKEN) {
  try {
    process.env.GITHUB_TOKEN = execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch { /* gh not available */ }
}

import { autoSolve } from "./src/auto-solver.mjs";
import { scanGithubBounties } from "./src/platforms/github-bounty.mjs";
import { filterJobs } from "./src/filter.mjs";
import { getSeenIds, markSeen, recordSubmission, recordDraft } from "./src/tracker.mjs";

async function run() {
  const ts = new Date().toISOString();
  console.log(`\n${"=".repeat(42)}`);
  console.log(`  GITHUB BOUNTY HUNTER  [${ts}]`);
  console.log(`${"=".repeat(42)}\n`);

  console.log("STEP 1: Scanning GitHub bounties...\n");
  const jobs = await scanGithubBounties();
  console.log(`  Found: ${jobs.length} bounties\n`);

  const seenIds = getSeenIds();
  const newJobs = jobs.filter((j) => !seenIds.has(j.id));
  console.log(`STEP 2: ${jobs.length} total → ${newJobs.length} new → scoring...`);

  const topJobs = await filterJobs(newJobs, new Set());
  for (const j of newJobs) markSeen(j.id);

  if (topJobs.length === 0) {
    console.log("No relevant new jobs. Try again later.");
    return;
  }

  console.log(`\n→ ${topJobs.length} actionable bounties:`);
  for (const j of topJobs) {
    console.log(`  $${j.budget} | score ${j.score}/10 | ${j.title.slice(0, 60)}`);
  }

  console.log("\nSTEP 3: Auto-solving...");
  for (const job of topJobs) {
    console.log(`\n🤖 ${job.title.slice(0, 60)}`);
    try {
      const result = await autoSolve(job);
      recordSubmission(job, { proposal: result.commit, bid: `$${result.bounty}` });
      console.log(`  ✅ PR: ${result.prUrl} | $${result.bounty}`);
    } catch (err) {
      recordDraft(job, { proposal: "", bid: `$${job.budget}` });
      console.warn(`  ✗ ${err.message}`);
    }
  }
}

run().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
