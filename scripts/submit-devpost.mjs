/**
 * Devpost 自動提出スクリプト
 * 事前にChromeを閉じてから実行: node scripts/submit-devpost.mjs
 */
import { chromium } from "playwright";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CHROME_PROFILE = "C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data";
const GITHUB_URL = "https://github.com/YUIN1231/bounty-hunter";

const SUBMISSIONS = [
  {
    id: "gitlab-transcend",
    hackathonUrl: "https://gitlab-transcend.devpost.com/",
    title: "Bounty Hunter — AI-Powered Opportunity Pipeline with GitLab CI/CD",
    tagline: "Never miss a hackathon again. Automated daily scanning, AI scoring, and GitLab-powered deployment pipeline.",
    description: `Bounty Hunter is an automated system that continuously scans 5+ platforms (Devpost, HackerOne, Gitcoin, Kaggle, HeroX) for prize opportunities, scores them using Claude AI, and surfaces the highest-value ones in a clean dashboard.

The GitLab CI/CD pipeline powers:
- Automated daily scans via GitLab Schedules
- Build validation on every commit
- One-command deployment to any server

Built with Next.js 16, TypeScript, Tailwind CSS v4, Claude AI (Haiku).

GitLab Integration: .gitlab-ci.yml with 3 stages: test → build → scan. GitLab Schedules trigger daily automated scans.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "GitLab CI/CD", "Tailwind CSS"],
    videoUrl: "",
    tryItUrl: GITHUB_URL,
  },
  {
    id: "uipath-agenthack",
    hackathonUrl: "https://uipath-agenthack.devpost.com/",
    title: "Bounty Hunter Agent — Autonomous Prize Opportunity Discovery",
    tagline: "An AI agent that hunts prize money across the internet so you don't have to.",
    description: `Bounty Hunter is an autonomous agent that discovers, evaluates, and prioritizes prize opportunities across 5 major platforms — all without human intervention.

The agentic loop: Trigger → Parallel scrape (5 platforms) → Claude AI evaluation → Score & rank → Surface to user.

Operates continuously, makes autonomous scoring decisions, handles failures gracefully, and surfaces only the highest-ROI opportunities.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Node.js", "Tailwind CSS"],
    videoUrl: "",
    tryItUrl: GITHUB_URL,
  },
  {
    id: "moonshot",
    hackathonUrl: "https://moonshot-aethra.devpost.com/",
    title: "Bounty Hunter — AI Prize Intelligence for Solo Developers",
    tagline: "The moonshot: make prize hunting a viable full-time income stream for solo developers.",
    description: `Millions of dollars in hackathon prizes go unclaimed or to insiders. Bounty Hunter democratizes access by automatically surfacing every open opportunity, ranked by AI.

Scans Devpost, HackerOne, Gitcoin, Kaggle, HeroX daily. Claude AI scores each opportunity by prize value, deadline urgency, and solo eligibility.

Target: $50,000/year in prizes for a solo developer running this system consistently.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
    videoUrl: "",
    tryItUrl: GITHUB_URL,
  },
];

async function submitToDevpost(page, submission) {
  console.log(`\n🎯 ${submission.id} に提出中...`);

  // ハッカソンページへ
  await page.goto(submission.hackathonUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // "Submit project" ボタンを探す
  const submitBtn = page.locator('a:has-text("Submit project"), a:has-text("Enter a submission"), button:has-text("Submit")').first();
  if (await submitBtn.count() === 0) {
    console.log(`  ⚠ Submit ボタンが見つかりません。手動確認が必要: ${submission.hackathonUrl}`);
    return false;
  }

  await submitBtn.click();
  await page.waitForTimeout(3000);

  // プロジェクト名
  const titleField = page.locator('input[name="submission[title]"], input[placeholder*="title" i], #submission_title').first();
  if (await titleField.count() > 0) {
    await titleField.fill(submission.title);
  }

  // タグライン
  const taglineField = page.locator('input[name="submission[tagline]"], input[placeholder*="tagline" i], #submission_tagline').first();
  if (await taglineField.count() > 0) {
    await taglineField.fill(submission.tagline);
  }

  // 説明文
  const descField = page.locator('textarea[name="submission[description]"], #submission_description, .CodeMirror').first();
  if (await descField.count() > 0) {
    await descField.fill(submission.description);
  }

  // GitHub URL
  const repoField = page.locator('input[placeholder*="github" i], input[name*="url" i], input[name*="repo" i]').first();
  if (await repoField.count() > 0) {
    await repoField.fill(submission.tryItUrl);
  }

  console.log(`  ✓ フォーム入力完了 — 確認のため一時停止`);
  console.log(`  → ブラウザを確認して Submit を押してください`);
  await page.waitForTimeout(5000);

  return true;
}

async function main() {
  console.log("🏹 Bounty Hunter — Devpost 自動提出スクリプト");
  console.log("=====================================");
  console.log(`GitHub: ${GITHUB_URL}`);
  console.log("");

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
    userDataDir: CHROME_PROFILE,
    args: ["--no-first-run", "--no-default-browser-check"],
  });

  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();

  // Devpost ログイン確認
  await page.goto("https://devpost.com/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const isLoggedIn = await page.locator('[data-user-logged-in="true"], .user-avatar, a[href*="/logout"]').count() > 0;

  if (!isLoggedIn) {
    console.log("⚠ Devpost にログインしていません");
    console.log("  → ブラウザでログインして Enter を押してください");
    await page.goto("https://devpost.com/users/sign_in");
    // ログイン待機
    await page.waitForURL("**/dashboard**", { timeout: 120000 });
    console.log("  ✓ ログイン確認");
  } else {
    console.log("✓ Devpost ログイン確認済み");
  }

  // 各ハッカソンに提出
  for (const submission of SUBMISSIONS) {
    await submitToDevpost(page, submission);
    await page.waitForTimeout(3000);
  }

  console.log("\n✅ 処理完了。ブラウザを手動で閉じてください。");
}

main().catch(console.error);
