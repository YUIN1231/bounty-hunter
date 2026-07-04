import { client } from "./claude-client.mjs";
import { CONFIG } from "./config.mjs";

export async function generateProposal(job) {
  const isCrowdWorks = job.platform === "crowdworks";
  const isGitHubBounty = job.platform === "github";

  if (isGitHubBounty) return generateGithubPlan(job);
  if (isCrowdWorks) return generateCrowdWorksProposal(job);
  return generateUpworkProposal(job);
}

async function generateUpworkProposal(job) {
  const prompt = `Write a winning Upwork proposal. Max 200 words. No generic openers.

FREELANCER: ${CONFIG.profile.name} | Skills: ${CONFIG.profile.skills.join(", ")}
Bio: ${CONFIG.profile.bio}
Rate: $${CONFIG.profile.hourlyRateMín}+/hr

JOB: ${job.title}
Description: ${job.description.slice(0, 500)}
Budget: ${job.budgetText || "not specified"}

Rules:
1. First sentence: show you READ the job (mention a specific detail)
2. Why you're the right person (match skills)
3. One concrete example/result
4. CTA: offer small first deliverable or quick chat

Respond JSON: {"proposal":"...","bid":"e.g. $500 fixed or $45/hr","coverLetterSubject":"..."}`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  const json = JSON.parse(res.content[0].text.match(/\{[\s\S]+\}/)[0]);
  return { proposal: json.proposal, bid: json.bid, subject: json.coverLetterSubject ?? job.title };
}

async function generateCrowdWorksProposal(job) {
  const prompt = `クラウドワークスのタスク形式の案件に応募文を書いてください。150文字以内。

あなたのプロフィール:
名前: ${CONFIG.profile.name}
スキル: ${CONFIG.profile.skills.join(", ")}
自己紹介: ${CONFIG.profile.bio}

案件:
タイトル: ${job.title}
内容: ${job.description.slice(0, 400)}
報酬: ${job.budgetText || "未記載"}

ルール:
1. 最初の一文: この案件を読んだことを示す（具体的な言及）
2. なぜあなたが適任か（スキルとの一致）
3. 具体的な実績や経験を1つ
4. 「すぐに取り掛かれます」など行動を促す一言
5. 丁寧だが簡潔に。馬鹿丁寧な挨拶文は不要

報酬の提案額も考えて（案件報酬の90%程度、または時給なら1200〜2000円）

JSON形式で回答: {"proposal":"...","bid":"例: 4500円 または 1500円/時","subject":"件名60文字以内"}`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  const json = JSON.parse(res.content[0].text.match(/\{[\s\S]+\}/)[0]);
  return { proposal: json.proposal, bid: json.bid, subject: json.subject ?? job.title };
}

async function generateGithubPlan(job) {
  const prompt = `You are a developer evaluating a GitHub bounty issue to decide whether to work on it.

Issue: ${job.title}
Repo: ${job.repoUrl ?? ""}
Bounty: $${job.budget}
Labels: ${job.skills.join(", ")}
Description: ${job.description.slice(0, 600)}

Developer skills: ${CONFIG.profile.skills.join(", ")}

Provide:
1. Can this developer likely solve this? (yes/probably/unlikely)
2. Estimated hours to solve
3. First step to take (clone repo? read what file? etc.)
4. One-sentence pitch if commenting on the issue to claim it

Respond JSON: {"canSolve":"yes|probably|unlikely","hours":N,"firstStep":"...","claimComment":"..."}`;

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const json = JSON.parse(res.content[0].text.match(/\{[\s\S]+\}/)[0]);
  return {
    proposal: json.claimComment,
    bid: `$${job.budget}`,
    subject: `Bounty: ${job.title.slice(0, 60)}`,
    plan: { canSolve: json.canSolve, hours: json.hours, firstStep: json.firstStep },
  };
}
