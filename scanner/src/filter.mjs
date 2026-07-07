import { client, hasAI } from "./claude-client.mjs";
import { CONFIG } from "./config.mjs";

const TECH_KW = [
  "javascript", "typescript", "node", "react", "next", "vue", "svelte",
  "playwright", "automation", "api", "web", "frontend", "backend",
  "llm", "ai", "openai", "anthropic", "claude", "chatgpt",
  "fullstack", "full-stack", "prisma", "graphql", "rest",
  "css", "html", "tailwind", "vite", "express", "fastify", "hono",
];

function keywordScore(job) {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const hits = TECH_KW.filter((kw) => text.includes(kw)).length;
  const budget = job.budget ?? 0;
  let score = Math.min(hits * 1.5, 6);
  if (budget >= 200) score += 2;
  else if (budget >= 100) score += 1.5;
  else if (budget >= 50) score += 1;
  return { score: Math.round(Math.min(score, 9)), reason: `keyword-only (${hits} tech hits, $${budget})` };
}

export async function scoreJob(job) {
  if (!hasAI) return keywordScore(job);

  const prompt = `Score this job 0-10 for this developer. Be concise.

Developer skills: ${CONFIG.profile.skills.join(", ")}
Min rate: $${CONFIG.profile.hourlyRateMín}/hr

Job (${job.platform}):
Title: ${job.title}
Budget: ${job.budgetText || `$${job.budget || "?"}`}
Skills: ${job.skills?.join(", ") || "not listed"}
Description: ${(job.description || "").slice(0, 300)}

Scoring:
8-10: Strong skill match, good budget, clear scope
5-7: Partial match or moderate budget
2-4: Weak match, spam, very low budget
0-1: Completely unrelated or fake

Reply with ONLY valid JSON: {"score":7,"reason":"one line"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content[0].text.trim();
      const match = text.match(/\{[^}]+\}/);
      if (!match) throw new Error(`No JSON in response: ${text.slice(0, 50)}`);
      const json = JSON.parse(match[0]);
      return { score: Number(json.score) || 5, reason: json.reason || "" };
    } catch (err) {
      const is529 = err.message?.includes("529") || err.status === 529;
      if (is529 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      return { score: 5, reason: `err: ${err.message.slice(0, 40)}` };
    }
  }
  return { score: 5, reason: "err: max retries" };
}

export async function filterJobs(jobs, alreadySeen) {
  const newJobs = jobs.filter((j) => !alreadySeen.has(j.id));
  if (!newJobs.length) return [];

  console.log(`\nScoring ${newJobs.length} jobs... (AI: ${hasAI ? "on" : "off - keyword mode"})`);
  const scored = [];

  for (const job of newJobs) {
    const { score, reason } = await scoreJob(job);
    scored.push({ ...job, score, reason });
    const filled = Math.round(score);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    const icon = job.platform === "github" ? "🟢" : "🔵";
    console.log(`  ${icon} [${bar}] ${score}/10 — ${job.title.slice(0, 45)} | ${reason}`);
  }

  return scored
    .filter((j) => j.score >= (j.platform === "github" ? 7 : 6))
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.search.maxPerRun);
}
