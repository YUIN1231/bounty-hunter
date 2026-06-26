/**
 * Chrome CDP 接続で Devpost 全自動提出
 * node scripts/submit-cdp.mjs
 */
import { chromium } from "playwright";

const GITHUB_URL = "https://github.com/YUIN1231/bounty-hunter";
const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

const SUBMISSIONS = [
  {
    hackathonUrl: "https://moonshot-aethra.devpost.com/",
    title: "Bounty Hunter — AI Prize Intelligence for Solo Developers",
    tagline: "The moonshot: make prize hunting a viable full-time income stream for solo developers.",
    description: `Millions of dollars in hackathon prizes go unclaimed. Bounty Hunter democratizes access by automatically surfacing every open opportunity, ranked by AI.\n\nScans Devpost, HackerOne, Gitcoin, Kaggle, HeroX daily. Claude AI scores each opportunity by prize value, deadline urgency, and solo eligibility.\n\nTarget: $50,000/year in prizes for a solo developer running this consistently.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://hyperbloom-summer-hackathon.devpost.com/",
    title: "Bounty Hunter — Democratizing Access to Prize Opportunities",
    tagline: "Making prize money accessible to every developer, regardless of network or location.",
    description: `Hackathon opportunities are discovered through insider networks. Developers without strong tech connections miss out on thousands of dollars.\n\nBounty Hunter is infrastructure for equitable opportunity discovery — universal access regardless of geography, filters for online-only, free and open.`,
    builtWith: ["Next.js", "Claude AI", "Open APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://chutes-hack-malaysia-2026.devpost.com/",
    title: "Bounty Hunter — AI Web Intelligence Dashboard",
    tagline: "5 platforms. 1 scan. AI-ranked results in under 5 seconds.",
    description: `Parallel async scraping of 5 platforms. Claude AI evaluates each opportunity in a single batch call. Southeast Asian developers face information asymmetry — Bounty Hunter solves this with automated, always-on scanning.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://uipath-agenthack.devpost.com/",
    title: "Bounty Hunter Agent — Autonomous Prize Opportunity Discovery",
    tagline: "An AI agent that hunts prize money across the internet so you don't have to.",
    description: `Autonomous agent: Trigger → Parallel scrape (5 platforms) → Claude AI evaluation → Score & rank → Surface to user.\n\nOperates continuously, makes autonomous scoring decisions, handles failures gracefully.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Node.js", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://qwencloud-hackathon.devpost.com/",
    title: "Bounty Hunter — Multi-Source AI Prize Discovery Agent",
    tagline: "An AI agent that never sleeps, scanning the web for your next prize opportunity.",
    description: `Multi-source AI agent: dispatches parallel scraping agents to 5 platforms, feeds results to LLM scorer, aggregates and presents actionable intelligence. Eliminates 30+ minutes/day of manual checking.`,
    builtWith: ["Next.js", "TypeScript", "LLM API", "Tailwind CSS", "Node.js"],
  },
  {
    hackathonUrl: "https://slackhack.devpost.com/",
    title: "Bounty Hunter Slack Bot — Prize Alerts in Your Workspace",
    tagline: "AI-ranked bounty opportunities delivered to your Slack channel every morning.",
    description: `Slack bot running Bounty Hunter scans on a schedule, posting top opportunities to a channel daily.\n\nSlash commands: /bounty scan, /bounty top 5, /bounty filter hackathon\n\nBuilt with Slack Bolt SDK + Next.js dashboard.`,
    builtWith: ["Next.js", "Slack Bolt", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://easygo-mini-hackathon.devpost.com/",
    title: "Bounty Hunter — Enterprise Prize & Bounty Intelligence Dashboard",
    tagline: "Track every prize opportunity across 5 platforms before your competitors do.",
    description: `Aggregates opportunities from Devpost, HackerOne, Gitcoin, Kaggle, HeroX. AI scoring by ROI. Real-time dashboard with filter by category, prize floor, deadline.\n\nEnterprise use: identify hackathons for engineering teams, track bug bounty programs, never miss Kaggle competitions.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "REST APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://oa-ai-for-social-good.devpost.com/",
    title: "Bounty Hunter — Equitable Access to Prize-Based Income",
    tagline: "AI-powered infrastructure making prize money accessible to every developer, everywhere.",
    description: `Talented developers in low-income countries miss out on hackathon prizes due to information asymmetry.\n\nBounty Hunter closes the gap: universal access regardless of location, online-only filters, free and open source.`,
    builtWith: ["Next.js", "Claude AI", "Open APIs", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://pinch-me-i-want-50k.devpost.com/",
    title: "Bounty Hunter — AI-Powered Prize Aggregator",
    tagline: "Automatically scan every prize opportunity across the internet, ranked by AI.",
    description: `Scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX simultaneously. Claude AI scores 0-100 based on prize amount, deadline, and solo eligibility. One click scan, instant ranked results.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"],
  },
  {
    hackathonUrl: "https://gitlab-transcend.devpost.com/",
    title: "Bounty Hunter — AI-Powered Opportunity Pipeline with GitLab CI/CD",
    tagline: "Never miss a hackathon again. Automated daily scanning with GitLab-powered CI/CD.",
    description: `Automated system scanning 5+ platforms for prize opportunities, scored by Claude AI.\n\nGitLab CI/CD: .gitlab-ci.yml with test → build → scan stages. GitLab Schedules trigger daily automated scans.`,
    builtWith: ["Next.js", "TypeScript", "Claude AI", "GitLab CI/CD", "Tailwind CSS"],
  },
];

async function tryClick(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 3000 })) {
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
      if (await el.count() > 0 && await el.isVisible({ timeout: 3000 })) {
        await el.click({ force: true });
        await el.fill(value);
        return true;
      }
    } catch { /* skip */ }
  }
  return false;
}

async function handleHackathon(page, sub, index) {
  LOG(`[${index + 1}/10] ${sub.title.slice(0, 50)}...`);
  try {
    await page.goto(sub.hackathonUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Join がある場合はまず Join
    const joined = await tryClick(page, [
      'a:has-text("Join Hackathon")',
      'button:has-text("Join Hackathon")',
      'a:has-text("Register to participate")',
    ]);
    if (joined) {
      LOG("  → Join 中...");
      await page.waitForTimeout(3000);
      await tryClick(page, ['button:has-text("Continue")', 'button:has-text("Join")', 'input[type="submit"]']);
      await page.waitForTimeout(2000);
    }

    // Submit ボタンを探す
    let submitClicked = await tryClick(page, [
      'a:has-text("Submit project")',
      'a:has-text("Enter a submission")',
      'a:has-text("Start a submission")',
      'a:has-text("Add a submission")',
      'a[href*="submissions/new"]',
    ]);

    if (!submitClicked) {
      // ページ内のリンクを全部調べる
      const hrefs = await page.locator("a[href]").evaluateAll(
        els => els.map(e => ({ text: e.textContent?.trim(), href: e.href }))
      );
      const subLink = hrefs.find(h => /submit|submission/i.test(h.href) || /submit project/i.test(h.text || ""));
      if (subLink) {
        await page.goto(subLink.href, { waitUntil: "domcontentloaded" });
        submitClicked = true;
        LOG(`  → 提出ページへ移動: ${subLink.href}`);
      }
    }

    if (!submitClicked) {
      LOG(`  ⚠ Submit ボタン見つからず — スキップ`);
      return "no-button";
    }

    await page.waitForTimeout(3000);

    // タイトル
    await tryFill(page, ['input[name="submission[title]"]', '#submission_title', 'input[placeholder*="title" i]'], sub.title);
    // タグライン
    await tryFill(page, ['input[name="submission[tagline]"]', '#submission_tagline', 'input[placeholder*="tagline" i]'], sub.tagline);
    // 説明
    await tryFill(page, ['textarea[name="submission[description]"]', '#submission_description', 'textarea[placeholder*="description" i]'], sub.description);
    // URL
    await tryFill(page, ['input[name="submission[url]"]', 'input[placeholder*="github" i]', 'input[placeholder*="project url" i]', 'input[placeholder*="try it" i]'], GITHUB_URL);
    // Built with
    for (const tech of sub.builtWith) {
      const ok = await tryFill(page, ['input[placeholder*="built with" i]', '#submission_built_with_tag'], tech);
      if (ok) { await page.keyboard.press("Enter"); await page.waitForTimeout(300); }
    }

    // Save
    await tryClick(page, [
      'button:has-text("Save & continue")',
      'button:has-text("Save")',
      'button:has-text("Next")',
      'input[type="submit"]',
      'button[type="submit"]',
    ]);

    await page.waitForTimeout(3000);
    LOG(`  ✓ 完了`);
    return "ok";
  } catch (e) {
    LOG(`  ✗ ${String(e.message).slice(0, 80)}`);
    return "error";
  }
}

async function main() {
  LOG("🏹 CDP接続モード — Bounty Hunter 全自動提出");

  // 既存 Chrome に接続
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  LOG("✓ Chrome に接続");

  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages[0] || await context.newPage();

  // Devpost ログイン確認
  await page.goto("https://devpost.com", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const isLoggedIn = (await page.locator('.user-avatar, nav a[href*="/logout"], [data-behavior="user-menu"]').count()) > 0;

  if (!isLoggedIn) {
    LOG("Devpost にログインしてください...");
    await page.goto("https://devpost.com/users/sign_in");
    await page.waitForURL(/devpost\.com(?!\/users\/sign)/, { timeout: 300000 });
    LOG("✓ ログイン確認");
  } else {
    LOG("✓ Devpost ログイン済み");
  }

  const results = [];
  for (let i = 0; i < SUBMISSIONS.length; i++) {
    const result = await handleHackathon(page, SUBMISSIONS[i], i);
    results.push({ title: SUBMISSIONS[i].title.slice(0, 40), result });
    await page.waitForTimeout(1000);
  }

  LOG("\n===== 結果 =====");
  let ok = 0;
  results.forEach((r, i) => {
    const icon = r.result === "ok" ? "✓" : "⚠";
    if (r.result === "ok") ok++;
    LOG(`${icon} [${i + 1}] ${r.result.padEnd(10)} ${r.title}`);
  });
  LOG(`\n提出成功: ${ok}/10`);
}

main().catch(console.error);
