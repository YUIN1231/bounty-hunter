import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const DB_PATH = join(__dir, "../data/submissions.json");

function load() {
  if (!existsSync(DB_PATH)) return { seen: {}, submissions: [] };
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf8"));
  } catch {
    return { seen: {}, submissions: [] };
  }
}

function save(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function getSeenIds() {
  const db = load();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  // IDs we actually applied to — never expire these
  const appliedIds = new Set(db.submissions.map((s) => s.id));
  let changed = false;
  for (const [id, ts] of Object.entries(db.seen)) {
    if (appliedIds.has(id)) continue; // keep submitted/drafted jobs forever
    if (now - new Date(ts).getTime() > sevenDays) {
      delete db.seen[id];
      changed = true;
    }
  }
  if (changed) save(db);
  return new Set(Object.keys(db.seen));
}

export function markSeen(jobId) {
  const db = load();
  db.seen[jobId] = new Date().toISOString();
  save(db);
}

export function recordSubmission(job, proposal) {
  const db = load();
  db.seen[job.id] = new Date().toISOString();
  db.submissions.push({
    id: job.id,
    title: job.title,
    url: job.url,
    budget: job.budget,
    score: job.score,
    bid: proposal.bid,
    proposalText: proposal.proposal,
    submittedAt: new Date().toISOString(),
    status: "submitted",
  });
  save(db);
}

export function recordDraft(job, proposal) {
  const db = load();
  db.seen[job.id] = new Date().toISOString();
  db.submissions.push({
    id: job.id,
    title: job.title,
    url: job.url,
    budget: job.budget,
    score: job.score,
    bid: proposal.bid,
    proposalText: proposal.proposal,
    draftedAt: new Date().toISOString(),
    status: "draft",
  });
  save(db);
}

export function getStats() {
  const db = load();
  const subs = db.submissions;
  const byStatus = subs.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return {
    total: subs.length,
    byStatus,
    recent: subs.slice(-10).reverse(),
  };
}
