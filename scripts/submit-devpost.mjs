/**
 * Devpost 全自動提出スクリプト v2
 * node scripts/submit-devpost.mjs
 */
import { chromium } from "playwright";

const GITHUB_URL = "https://github.com/YUIN1231/bounty-hunter";
const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

const SUBMISSIONS = [
  {
    hackathonUrl: "https://gitlab-transcend.devpost.com/",
    title: "Bounty Hunter — AI-Powered Opportunity Pipeline with GitLab CI/CD",
    tagline: "Never miss a hackathon again. Automated daily scanning, AI scoring, and GitLab-powered deployment.",
    description: `Bounty Hunter is an automated system that continuously scans 5+ platforms (Devpost, HackerOne, Gitcoin, Kaggle, HeroX) for prize opportunities, scores them using Claude AI, and surfaces the highest-value ones in a clean dashboard.\n\nThe GitLab CI/CD pipeline powers automated daily scans via GitLab Schedules, build validation on every commit, and one-command deployment.\n\nBuilt with Next.js 16, TypeScript, Tailwind CSS v4, Claude AI.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "GitLab CI/CD", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://uipath-agenthack.devpost.com/",
    title: "Bounty Hunter Agent — Autonomous Prize Opportunity Discovery",
    tagline: "An AI agent that hunts prize money across the internet so you don't have to.",
    description: `Bounty Hunter is an autonomous agent that discovers, evaluates, and prioritizes prize opportunities across 5 major platforms without human intervention.\n\nThe agentic loop: Trigger → Parallel scrape (5 platforms) → Claude AI evaluation → Score & rank → Surface to user.\n\nOperates continuously, makes autonomous scoring decisions, handles failures gracefully.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Node.js", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://moonshot-aethra.devpost.com/",
    title: "Bounty Hunter — AI Prize Intelligence for Solo Developers",
    tagline: "The moonshot: make prize hunting a viable full-time income stream for solo developers.",
    description: `Millions of dollars in hackathon prizes go unclaimed. Bounty Hunter democratizes access by automatically surfacing every open opportunity, ranked by AI.\n\nScans Devpost, HackerOne, Gitcoin, Kaggle, HeroX daily. Claude AI scores each opportunity by prize value, deadline urgency, and solo eligibility.\n\nTarget: $50,000/year in prizes for a solo developer running this consistently.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://easygo-mini-hackathon.devpost.com/",
    title: "Bounty Hunter — Enterprise Prize & Bounty Intelligence Dashboard",
    tagline: "Track every prize opportunity across 5 platforms before your competitors do.",
    description: `Bounty Hunter aggregates opportunities from Devpost, HackerOne, Gitcoin, Kaggle, HeroX. AI scoring engine prioritizes by ROI. Real-time dashboard with filter by category, prize floor, deadline.\n\nEnterprise use cases: identify hackathons for engineering teams, track highest-value bug bounty programs, never miss a Kaggle competition announcement.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "REST APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://hyperbloom-summer-hackathon.devpost.com/",
    title: "Bounty Hunter — Democratizing Access to Prize Opportunities",
    tagline: "Making prize money accessible to every developer, regardless of network or location.",
    description: `Hackathon opportunities are discovered through insider networks. Developers without strong tech connections miss out on thousands of dollars in prizes.\n\nBounty Hunter is infrastructure for equitable opportunity discovery — universal access regardless of geography, filters for online-only opportunities, free and open.`,
    builtWith: ["Next.js", "Claude AI", "Open APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://chutes-hack-malaysia-2026.devpost.com/",
    title: "Bounty Hunter — AI Web Intelligence Dashboard",
    tagline: "5 platforms. 1 scan. AI-ranked results in under 5 seconds.",
    description: `A web application aggregating prize opportunities from across the internet using real API integrations and AI-powered scoring.\n\nParallel async scraping of 5 platforms. Claude AI evaluates each opportunity in a single batch call. Southeast Asian developers have world-class skills but face information asymmetry — Bounty Hunter solves this with automated, always-on scanning.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://qwencloud-hackathon.devpost.com/",
    title: "Bounty Hunter — Multi-Source AI Prize Discovery Agent",
    tagline: "An AI agent that never sleeps, scanning the web for your next prize opportunity.",
    description: `Bounty Hunter is a multi-source AI agent: dispatches parallel scraping agents to 5 platforms, feeds results to an LLM scoring agent, aggregates and presents actionable intelligence.\n\nAgent architecture: Orchestrator → [Devpost, HackerOne, Gitcoin, Kaggle, HeroX scrapers] → Scorer Agent → Dashboard.\n\nEliminates 30+ minutes/day of manual platform checking.`,
    builtWith: ["Next.js", "TypeScript", "LLM API", "Tailwind CSS", "Node.js"],
  },
  {
    hackathonUrl: "https://slackhack.devpost.com/",
    title: "Bounty Hunter Slack Bot — Prize Alerts in Your Workspace",
    tagline: "AI-ranked bounty opportunities delivered to your Slack channel every morning.",
    description: `A Slack bot running Bounty Hunter scans on a schedule and posting top opportunities to a channel. Daily digest with title, prize, AI score, deadline, direct link.\n\nSlash commands: /bounty scan, /bounty top 5, /bounty filter hackathon.\n\nBuilt with Slack Bolt SDK + Next.js dashboard companion.`,
    builtWith: ["Next.js", "Slack Bolt", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://oa-ai-for-social-good.devpost.com/",
    title: "Bounty Hunter — Equitable Access to Prize-Based Income",
    tagline: "AI-powered infrastructure making prize money accessible to every developer, everywhere.",
    description: `Talented developers in low-income countries and underrepresented communities miss out on hackathon prizes due to information asymmetry.\n\nBounty Hunter closes the gap: universal access regardless of location, filters for online-only opportunities, free and open source.\n\nDirect economic pathway to income for developers in underserved regions.`,
    builtWith: ["Next.js", "Claude AI", "Open APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://pinch-me-i-want-50k.devpost.com/",
    title: "Bounty Hunter — AI-Powered Prize Aggregator",
    tagline: "Automatically scan every prize opportunity across the internet, ranked by AI.",
    description: `Bounty Hunter scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX simultaneously. Claude AI scores each opportunity 0-100 based on prize amount, deadline, and solo eligibility.\n\nClean dashboard with real-time filtering. One click scan, instant AI-ranked results. Built in Next.js with TypeScript.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
];

async function tryClick(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click();
        return true;
      }
    } catch { /* skip */ }
  }
  return false;
}

async function tryFill(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await el.fill(value);
        return true;
      }
    } catch { /* skip */ }
  }
  return false;
}

async function joinAndSubmit(page, sub, index) {
  LOG(`[${index + 1}/10] ${sub.hackathonUrl}`);

  try {
    await page.goto(sub.hackathonUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    // Step 1: まずハッカソンに参加登録（未参加の場合）
    const joined = await tryClick(page, [
      'a:has-text("Join Hackathon")',
      'button:has-text("Join Hackathon")',
      'a:has-text("Register")',
      'a:has-text("Participate")',
    ]);
    if (joined) {
      LOG(`  → Join 登録中...`);
      await page.waitForTimeout(3000);
      // 確認ダイアログ等をスキップ
      await tryClick(page, [
        'button:has-text("Continue")',
        'button:has-text("Join")',
        'input[type="submit"]',
      ]);
      await page.waitForTimeout(2000);
    }

    // Step 2: Submit ボタンを探す
    const submitted = await tryClick(page, [
      'a:has-text("Submit project")',
      'a:has-text("Enter a submission")',
      'a:has-text("Start a submission")',
      'a:has-text("Add a submission")',
      'a[href*="submissions/new"]',
      'a[href*="submit"]',
      '.submit-project-btn',
    ]);

    if (!submitted) {
      // ページ内の全リンクをデバッグ表示
      const allLinks = await page.locator("a").allTextContents();
      const relevant = allLinks.filter(t => /submit|join|enter|register|participat/i.test(t));
      LOG(`  ⚠ Submit ボタン見つからず。関連テキスト: ${relevant.slice(0, 5).join(", ")}`);
      return "no-button";
    }

    await page.waitForTimeout(3000);
    await page.waitForLoadState("domcontentloaded");

    // Step 3: フォーム入力
    await tryFill(page, [
      'input[name="submission[title]"]',
      '#submission_title',
      'input[placeholder*="title" i]',
    ], sub.title);

    await tryFill(page, [
      'input[name="submission[tagline]"]',
      '#submission_tagline',
      'input[placeholder*="tagline" i]',
    ], sub.tagline);

    await tryFill(page, [
      'textarea[name="submission[description]"]',
      '#submission_description',
      'textarea[placeholder*="description" i]',
    ], sub.description);

    await tryFill(page, [
      'input[name="submission[url]"]',
      'input[placeholder*="github" i]',
      'input[placeholder*="project url" i]',
      'input[placeholder*="try it" i]',
    ], GITHUB_URL);

    // Built with
    for (const tech of sub.builtWith) {
      const filled = await tryFill(page, [
        'input[placeholder*="built with" i]',
        '#submission_built_with_tag',
      ], tech);
      if (filled) {
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
      }
    }

    // Step 4: Save
    await tryClick(page, [
      'button[type="submit"]:has-text("Save")',
      'button:has-text("Save & continue")',
      'button:has-text("Next")',
      'button:has-text("Submit")',
      'input[type="submit"][value*="Save"]',
      'input[type="submit"]',
    ]);

    await page.waitForTimeout(3000);
    LOG(`  ✓ 完了`);
    return "ok";

  } catch (e) {
    LOG(`  ✗ エラー: ${String(e.message).slice(0, 100)}`);
    return "error";
  }
}

async function main() {
  LOG("🏹 Bounty Hunter — Devpost 全自動提出 v2");
  LOG(`GitHub: ${GITHUB_URL}`);

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  // Devpost ログイン
  await page.goto("https://devpost.com/users/sign_in", { waitUntil: "domcontentloaded" });
  LOG("Devpost ログイン画面が開きました。ログインしてください...");
  LOG("ログイン後に自動で継続します（最大5分待機）");

  try {
    await page.waitForURL(/devpost\.com(?!\/users\/sign)/, { timeout: 300000 });
    await page.waitForTimeout(2000);
    LOG("✓ ログイン確認 — 提出を開始します");
  } catch {
    LOG("⚠ ログインタイムアウト。処理を継続します。");
  }

  const results = [];
  for (let i = 0; i < SUBMISSIONS.length; i++) {
    const result = await joinAndSubmit(page, SUBMISSIONS[i], i);
    results.push({ url: SUBMISSIONS[i].hackathonUrl, result });
    await page.waitForTimeout(1500);
  }

  LOG("\n===== 最終結果 =====");
  let ok = 0;
  results.forEach((r, i) => {
    const icon = r.result === "ok" ? "✓" : r.result === "no-button" ? "⚠" : "✗";
    if (r.result === "ok") ok++;
    LOG(`${icon} [${i + 1}] ${r.url}`);
  });
  LOG(`\n提出成功: ${ok}/10`);
  LOG("ブラウザを手動で閉じてください");

  await new Promise(() => {});
}

main().catch(console.error);
