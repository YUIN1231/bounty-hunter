/**
 * Opire Bounty Scanner
 * Public API: api.opire.dev/rewards?status=open — no auth required
 * Price unit: USD_CENT (divide by 100)
 */
import { CONFIG } from "../config.mjs";

const API = "https://api.opire.dev/rewards";
const GH_API = "https://api.github.com";

function ghHeaders() {
  const h = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

const BLOCKED_OWNERS = new Set([
  "UnsafeLabs", "SecureBananaLabs", "Scottcjn", "kickama-prize-lab", "xevrion-v2",
  "rodrigompy", "alisteuber4ee1", "lb1192176991-lab", // known fake/spam Opire accounts
]);

async function getRepoStars(owner, repo) {
  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, { headers: ghHeaders() });
    if (!res.ok) return { stars: 0, language: "" };
    const d = await res.json();
    return { stars: d.stargazers_count ?? 0, language: d.language ?? "" };
  } catch {
    return { stars: 0, language: "" };
  }
}

async function fetchPage(offset) {
  const res = await fetch(`${API}?status=open&limit=30&offset=${offset}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Opire API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data ?? data.rewards ?? []);
}

export async function scanOpireBounties() {
  const results = new Map();
  console.log("  [Opire] Fetching open rewards...");

  try {
    // Fetch up to 3 pages (API caps at 30/page, ~90 total open bounties)
    for (const offset of [0, 30, 60]) {
      const items = await fetchPage(offset);
      if (!items.length) break;

      for (const r of items) {
        if (results.has(r.url)) continue; // dedup

        const amount = r.pendingPrice ? Math.round(r.pendingPrice.value / 100) : 0;
        if (amount < 20) continue;

        const langs = r.programmingLanguages ?? [];
        const isJsTs = langs.length === 0 || langs.some((l) =>
          ["JavaScript", "TypeScript"].includes(l)
        );
        if (!isJsTs) continue;

        const match = r.url?.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
        if (!match) continue;
        const [, owner, repo, issueNum] = match;

        if (BLOCKED_OWNERS.has(owner)) continue;

        const { stars, language } = await getRepoStars(owner, repo);
        if (stars < 50) continue; // skip tiny/fake repos

        // Skip non-JS/TS repos (unless Opire reported a language)
        const lang = language.toLowerCase();
        if (langs.length === 0 && ["php","ruby","go","rust","swift","kotlin","java","c++","c#","python"].includes(lang)) continue;

        results.set(r.url, {
          id: r.url,
          platform: "github",
          title: r.title,
          url: r.url,
          repoUrl: `https://github.com/${owner}/${repo}`,
          description: "",
          budget: amount,
          budgetText: `$${amount}`,
          skills: langs,
          noInterview: true,
          stars,
          language,
          source: "opire",
          postedAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
        });

        await new Promise((r) => setTimeout(r, 150));
      }

      console.log(`    [Opire] offset=${offset} → ${results.size} bounties so far`);
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch (err) {
    console.warn(`    [Opire] Error: ${err.message}`);
  }

  console.log(`  [Opire] Total: ${results.size} JS/TS bounties ≥$20 on repos ≥50 stars`);
  return [...results.values()].sort((a, b) => b.budget - a.budget);
}
