/**
 * ハッカソン以外の賞金系プラットフォーム全登録
 * node scripts/submit-all.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const GITHUB_URL = "https://github.com/YUIN1231/bounty-hunter";

const TARGETS = [
  // ── Lablab.ai ──────────────────────────────────────────────
  {
    platform: "lablab",
    name: "AMD Developer Hackathon ACT II",
    url: "https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii",
    prize_usd: 20000,
    deadline: "2026-07-31",
    action: "join",
  },
  {
    platform: "lablab",
    name: "AI Genesis 2026",
    url: "https://lablab.ai/ai-hackathons/ai-genesis-2026",
    prize_usd: 10000,
    deadline: "2026-11-03",
    action: "join",
  },
  // ── HeroX ──────────────────────────────────────────────────
  {
    platform: "herox",
    name: "NIH ARISE-HIV LAUNCH Challenge",
    url: "https://www.herox.com/arisehivlaunch",
    prize_usd: 50000,
    deadline: "2026-09-30",
    action: "register",
  },
  {
    platform: "herox",
    name: "Community Champions Disability Health",
    url: "https://www.herox.com/communitydisabilityhealth",
    prize_usd: 485000,
    deadline: "2026-08-31",
    action: "register",
  },
  // ── Kaggle ─────────────────────────────────────────────────
  {
    platform: "kaggle",
    name: "ARC Prize 2026",
    url: "https://arcprize.org/competitions/2026",
    prize_usd: 700000,
    deadline: "2026-11-01",
    action: "register",
  },
  {
    platform: "kaggle",
    name: "Konwinski Prize",
    url: "https://www.kaggle.com/competitions/konwinski-prize",
    prize_usd: 1000000,
    deadline: "2026-12-31",
    action: "join",
  },
  // ── Gitcoin ────────────────────────────────────────────────
  {
    platform: "gitcoin",
    name: "Gitcoin Grants Round",
    url: "https://gitcoin.co/",
    prize_usd: 5000,
    deadline: null,
    action: "browse",
  },
  // ── Topcoder ───────────────────────────────────────────────
  {
    platform: "topcoder",
    name: "Topcoder Development Challenges",
    url: "https://www.topcoder.com/challenges/?tracks[]=Dev&orderBy=prize&orderByDir=desc",
    prize_usd: 2000,
    deadline: null,
    action: "browse",
  },
];

function addToPortfolio(entries) {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  let added = 0;
  for (const e of entries) {
    const exists = data.submissions.find(s => s.name === e.name);
    if (!exists) {
      data.submissions.push({
        id: e.platform + "-" + e.name.toLowerCase().replace(/\s+/g,"-").slice(0,25),
        name: e.name,
        url: e.url,
        prize_usd: e.prize_usd,
        deadline: e.deadline,
        status: e.result === "ok" ? "submitted" : "building",
        project: "bounty-hunter",
        win_rate_pct: null,
        participants: 0,
        prize_slots: 1,
        submitted_at: new Date().toISOString().slice(0,10),
        notes: e.platform,
      });
      added++;
    }
  }
  fs.writeFileSync(PORTFOLIO, JSON.stringify(data, null, 2));
  return added;
}

async function tryClick(page, sels) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({timeout:3000})) {
        await el.click(); return true;
      }
    } catch {}
  }
  return false;
}

async function processLablab(page, t) {
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  const joined = await tryClick(page, [
    'button:has-text("Join")',
    'a:has-text("Join hackathon")',
    'button:has-text("Register")',
    '[data-testid="join-button"]',
  ]);
  return joined ? "ok" : "visited";
}

async function processHeroX(page, t) {
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  const joined = await tryClick(page, [
    'a:has-text("Join Challenge")',
    'button:has-text("Join")',
    'a:has-text("Register")',
    'a:has-text("Participate")',
  ]);
  return joined ? "ok" : "visited";
}

async function processKaggle(page, t) {
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  const joined = await tryClick(page, [
    'button:has-text("Join Competition")',
    'a:has-text("Join Competition")',
    'button:has-text("Accept")',
  ]);
  return joined ? "ok" : "visited";
}

async function processBrowse(page, t) {
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);
  return "visited";
}

async function main() {
  LOG("🏹 ハッカソン以外の賞金系 全プラットフォーム登録開始");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  const results = [];

  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    LOG(`[${i+1}/${TARGETS.length}] ${t.platform.toUpperCase()} — ${t.name}`);

    try {
      let result = "error";
      if (t.platform === "lablab")   result = await processLablab(page, t);
      else if (t.platform === "herox")  result = await processHeroX(page, t);
      else if (t.platform === "kaggle") result = await processKaggle(page, t);
      else result = await processBrowse(page, t);

      LOG(`  ${result === "ok" ? "✓" : "→"} ${result}`);
      results.push({ ...t, result });
    } catch (e) {
      LOG(`  ✗ ${String(e.message).slice(0,60)}`);
      results.push({ ...t, result: "error" });
    }
    await page.waitForTimeout(1000);
  }

  // ポートフォリオに追加
  const added = addToPortfolio(results);
  LOG(`\nポートフォリオに ${added} 件追加`);

  LOG("\n===== 結果 =====");
  results.forEach((r, i) => {
    const icon = r.result === "ok" ? "✓" : r.result === "visited" ? "→" : "✗";
    LOG(`${icon} $${(r.prize_usd||0).toLocaleString().padStart(9)} | ${r.name}`);
  });

  const total = results.reduce((s, r) => s + (r.prize_usd||0), 0);
  LOG(`\n追加POTENTIAL: $${total.toLocaleString()}`);
}

main().catch(console.error);
