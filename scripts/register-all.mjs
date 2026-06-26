import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const GITHUB = "https://github.com/YUIN1231/bounty-hunter";

// ログイン確認ヘルパー
async function isLoggedIn(page, indicators) {
  for (const sel of indicators) {
    try {
      if (await page.locator(sel).count() > 0) return true;
    } catch {}
  }
  return false;
}

async function waitLogin(page, successUrl, label) {
  LOG(`  → ${label} にログインしてください（最大5分）`);
  try {
    await page.waitForURL(successUrl, { timeout: 300000 });
    await page.waitForTimeout(2000);
    LOG(`  ✓ ログイン確認`);
    return true;
  } catch {
    LOG(`  ✗ タイムアウト`);
    return false;
  }
}

async function tryClick(page, sels) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click(); return true;
      }
    } catch {}
  }
  return false;
}

// ── LABLAB ──────────────────────────────────────────────────
async function handleLablab(page) {
  LOG("\n[LABLAB.AI]");
  await page.goto("https://lablab.ai/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const loggedIn = await isLoggedIn(page, [
    '[data-testid="user-avatar"]', '.user-menu', 'a[href="/profile"]', 'img[alt*="avatar"]'
  ]);

  if (!loggedIn) {
    await page.goto("https://lablab.ai/auth/signin");
    await waitLogin(page, /lablab\.ai(?!\/auth)/, "Lablab.ai");
  } else {
    LOG("  ✓ ログイン済み");
  }

  const hackathons = [
    { name: "AMD Developer Hackathon ACT II", url: "https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii" },
    { name: "AI Genesis 2026", url: "https://lablab.ai/ai-hackathons/ai-genesis-2026" },
  ];

  for (const h of hackathons) {
    await page.goto(h.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const clicked = await tryClick(page, [
      'button:has-text("Join hackathon")',
      'button:has-text("Join")',
      'a:has-text("Join hackathon")',
      '[data-testid="join-button"]',
    ]);
    LOG(`  ${clicked ? "✓" : "→"} ${h.name}`);
    await page.waitForTimeout(1500);
  }
}

// ── HEROX ───────────────────────────────────────────────────
async function handleHeroX(page) {
  LOG("\n[HEROX]");
  await page.goto("https://www.herox.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const loggedIn = await isLoggedIn(page, [
    '.user-avatar', 'a[href*="/profile"]', '.navbar-user', 'a[href*="/logout"]'
  ]);

  if (!loggedIn) {
    await page.goto("https://www.herox.com/users/sign_in");
    await waitLogin(page, /herox\.com(?!\/users\/sign_in)/, "HeroX");
  } else {
    LOG("  ✓ ログイン済み");
  }

  const challenges = [
    { name: "NIH ARISE-HIV LAUNCH Challenge", url: "https://www.herox.com/arisehivlaunch" },
    { name: "Community Champions Disability Health", url: "https://www.herox.com/communitydisabilityhealth" },
  ];

  for (const c of challenges) {
    await page.goto(c.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const clicked = await tryClick(page, [
      'a:has-text("Join Challenge")',
      'button:has-text("Join Challenge")',
      'a:has-text("Participate")',
      'button:has-text("Participate")',
      'a:has-text("Register")',
    ]);
    LOG(`  ${clicked ? "✓" : "→"} ${c.name}`);
    await page.waitForTimeout(1500);
  }
}

// ── KAGGLE ──────────────────────────────────────────────────
async function handleKaggle(page) {
  LOG("\n[KAGGLE]");
  await page.goto("https://www.kaggle.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const loggedIn = await isLoggedIn(page, [
    'img[alt*="avatar"]', '.site-header__user', '[data-component-name="UserAvatar"]'
  ]);

  if (!loggedIn) {
    await page.goto("https://www.kaggle.com/account/login");
    await waitLogin(page, /kaggle\.com(?!\/account\/login)/, "Kaggle");
  } else {
    LOG("  ✓ ログイン済み");
  }

  const comps = [
    { name: "Konwinski Prize", url: "https://www.kaggle.com/competitions/konwinski-prize" },
    { name: "AI Cup 2026", url: "https://www.kaggle.com/competitions/ai-cup-2026-performance" },
  ];

  for (const c of comps) {
    await page.goto(c.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const clicked = await tryClick(page, [
      'button:has-text("Join Competition")',
      'a:has-text("Join Competition")',
      'button:has-text("Late Submission")',
      'button:has-text("Enter Competition")',
    ]);
    LOG(`  ${clicked ? "✓" : "→"} ${c.name}`);
    await page.waitForTimeout(2000);
  }
}

// ── TOPCODER ────────────────────────────────────────────────
async function handleTopcoder(page) {
  LOG("\n[TOPCODER]");
  await page.goto("https://www.topcoder.com/challenges/?tracks[]=Dev&orderBy=prize&orderByDir=desc", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const loggedIn = await isLoggedIn(page, ['.nav-user', 'a[href*="/members/"]', '.user-dropdown']);

  if (!loggedIn) {
    await page.goto("https://accounts.topcoder.com/member?retUrl=https://topcoder.com");
    await waitLogin(page, /topcoder\.com(?!\/account)/, "Topcoder");
  } else {
    LOG("  ✓ ログイン済み");
  }

  // 上位3件のチャレンジに登録試みる
  await page.goto("https://www.topcoder.com/challenges/?tracks[]=Dev&orderBy=prize&orderByDir=desc", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const links = await page.locator('a[href*="/challenges/"]').evaluateAll(
    els => [...new Set(els.map(e => e.href))].filter(h => /\/challenges\/[a-f0-9-]{30,}/.test(h)).slice(0, 3)
  );

  for (const link of links) {
    await page.goto(link, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const clicked = await tryClick(page, [
      'button:has-text("Register")',
      'a:has-text("Register")',
      'button:has-text("Submit")',
    ]);
    LOG(`  ${clicked ? "✓" : "→"} ${title.slice(0, 50)}`);
    await page.waitForTimeout(1500);
  }
}

// ── GITCOIN ─────────────────────────────────────────────────
async function handleGitcoin(page) {
  LOG("\n[GITCOIN]");
  await page.goto("https://gitcoin.co/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Gitcoinはウォレット接続が必要 → ページ確認のみ
  LOG("  → Gitcoinはウォレット接続が必要。スキップ（後で手動対応）");
}

async function updatePortfolio(platforms) {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  const toAdd = [
    { id: "kaggle-konwinski", name: "Konwinski Prize", platform: "kaggle", prize_usd: 1000000, deadline: "2026-12-31" },
    { id: "kaggle-aicup2026", name: "AI Cup 2026 Performance", platform: "kaggle", prize_usd: 50000, deadline: "2026-08-01" },
    { id: "topcoder-dev", name: "Topcoder Dev Challenges", platform: "topcoder", prize_usd: 2000, deadline: null },
  ];
  for (const e of toAdd) {
    if (!data.submissions.find(s => s.id === e.id)) {
      data.submissions.push({
        ...e, url: "", status: "submitted", project: "bounty-hunter",
        win_rate_pct: null, participants: 0, prize_slots: 1,
        submitted_at: new Date().toISOString().slice(0, 10), notes: e.platform,
      });
    }
  }
  fs.writeFileSync(PORTFOLIO, JSON.stringify(data, null, 2));
}

async function main() {
  LOG("🏹 全プラットフォーム登録開始");
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  await handleLablab(page);
  await handleHeroX(page);
  await handleKaggle(page);
  await handleTopcoder(page);
  await handleGitcoin(page);
  await updatePortfolio();

  LOG("\n✅ 全プラットフォーム処理完了");
}

main().catch(console.error);
