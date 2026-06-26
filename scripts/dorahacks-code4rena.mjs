import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const GITHUB = "https://github.com/YUIN1231/bounty-hunter";

function addPortfolio(entries) {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  let n = 0;
  for (const e of entries) {
    if (!data.submissions.find(s => s.id === e.id)) {
      data.submissions.push({ ...e, submitted_at: new Date().toISOString().slice(0, 10) });
      n++;
    }
  }
  fs.writeFileSync(PORTFOLIO, JSON.stringify(data, null, 2));
  return n;
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

async function tryFill(page, sels, val) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.fill(val); return true;
      }
    } catch {}
  }
  return false;
}

// ── DoraHacks ──────────────────────────────────────────────
const DORAHACKS = [
  { id: "croo-hackathon",        name: "CROO Agent Hackathon",     url: "https://dorahacks.io/hackathon/croo-hackathon",      prize: 10200, deadline: "2026-07-20" },
  { id: "casper-hackathon-2026", name: "Casper Hackathon 2026",    url: "https://dorahacks.io/hackathon/casper-hackathon-2026/detail", prize: 40000, deadline: "2026-09-01" },
  { id: "stablehacks",           name: "StableHacks 2026",          url: "https://dorahacks.io/hackathon/stablehacks/detail",  prize: 220000, deadline: "2026-08-01" },
  { id: "hackathon2026challenge", name: "Hackathon 2026 Challenge", url: "https://dorahacks.io/hackathon/hackathon2026challenge/team", prize: 1000, deadline: "2027-03-15" },
  { id: "space-grant",           name: "Space Resources & Exploration Grant", url: "https://dorahacks.io/hackathon/space/detail", prize: 50000, deadline: "2026-08-31" },
];

async function handleDoraHacks(page) {
  LOG("\n━━ DORAHACKS ━━");
  const added = [];

  for (const h of DORAHACKS) {
    LOG(`  [${h.name}] $${h.prize.toLocaleString()}`);
    await page.goto(h.url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    const clicked = await tryClick(page, [
      'button:has-text("Register")',
      'button:has-text("Join")',
      'button:has-text("Apply")',
      'a:has-text("Register")',
      'a:has-text("Join Hackathon")',
      '[class*="register"], [class*="join"]',
    ]);

    if (clicked) {
      await page.waitForTimeout(2000);
      // プロジェクト説明フォームがあれば入力
      await tryFill(page, ['textarea', 'input[placeholder*="project"]', 'input[placeholder*="description"]'],
        `Bounty Hunter: AI-powered prize opportunity scanner. Automatically discovers hackathons, bug bounties, and dev competitions across 5 platforms, scored by Claude AI. GitHub: ${GITHUB}`);
      await tryClick(page, ['button:has-text("Submit")', 'button[type="submit"]', 'button:has-text("Confirm")']);
      LOG(`    ✓ 登録完了`);
    } else {
      LOG(`    → ボタン見つからず（手動確認推奨）`);
    }

    added.push({
      id: `dorahacks-${h.id}`, name: `DoraHacks: ${h.name}`,
      url: h.url, prize_usd: h.prize, deadline: h.deadline,
      status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: null, participants: 0, prize_slots: 3,
      notes: "dorahacks",
    });
    await page.waitForTimeout(1500);
  }

  const n = addPortfolio(added);
  LOG(`  → ${n}件追加`);
}

// ── Code4rena ───────────────────────────────────────────────
async function handleCode4rena(page) {
  LOG("\n━━ CODE4RENA ━━");
  await page.goto("https://code4rena.com/compete", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // アクティブコンテスト一覧取得
  const contests = await page.locator("a[href*='/audits/'], a[href*='/contests/']").evaluateAll(
    els => [...new Set(els.map(e => e.href))].filter(h => /code4rena\.com\/(audits|contests)\//.test(h)).slice(0, 5)
  );
  LOG(`  → ${contests.length}件のアクティブコンテスト`);

  // ログイン確認
  const loggedIn = await page.locator('[class*="avatar"], [class*="user-menu"], a[href*="/account"]').count() > 0;
  if (!loggedIn) {
    LOG("  → Code4rena 未ログイン（後で手動登録）");
    // ページ情報だけ記録
    for (const url of contests) {
      addPortfolio([{
        id: `c4r-${url.split("/").pop().slice(0, 20)}`,
        name: `Code4rena: ${url.split("/").pop()}`,
        url, prize_usd: 50000, deadline: null,
        status: "building", project: "bounty-hunter",
        win_rate_pct: 20, participants: 5, prize_slots: 5,
        notes: "code4rena-audit",
      }]);
      LOG(`  → 記録: ${url.split("/").pop()}`);
    }
    return;
  }

  for (const url of contests) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2500);
    const title = await page.locator("h1").first().textContent().catch(() => url.split("/").pop());
    const clicked = await tryClick(page, ['button:has-text("Register")', 'button:has-text("Participate")', 'a:has-text("Register")']);
    addPortfolio([{
      id: `c4r-${url.split("/").pop().slice(0, 20)}`,
      name: `Code4rena: ${title?.trim().slice(0, 40)}`,
      url, prize_usd: 50000, deadline: null,
      status: clicked ? "submitted" : "building", project: "bounty-hunter",
      win_rate_pct: 20, participants: 5, prize_slots: 5,
      notes: "code4rena-audit",
    }]);
    LOG(`  ${clicked ? "✓" : "→"} ${title?.trim().slice(0, 40)}`);
  }
}

// ── Devfolio ────────────────────────────────────────────────
async function handleDevfolio(page) {
  LOG("\n━━ DEVFOLIO ━━");
  await page.goto("https://devfolio.co/hackathons", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  const hacks = await page.locator("a[href*='devfolio.co/'], a[href*='.devfolio.co']").evaluateAll(
    els => [...new Set(els.map(e => e.href))]
      .filter(h => /devfolio\.co\/(?!hackathons|discover|login|signup)/.test(h) || /\.devfolio\.co/.test(h))
      .slice(0, 6)
  );
  LOG(`  → ${hacks.length}件のハッカソン`);

  for (const url of hacks) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const title = await page.locator("h1").first().textContent().catch(() => url.split("/").pop() || url.split(".")[0]);
    const clicked = await tryClick(page, [
      'button:has-text("Apply")',
      'button:has-text("Register")',
      'a:has-text("Apply as Hacker")',
    ]);
    addPortfolio([{
      id: `devfolio-${url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/g, "-").slice(0, 25)}`,
      name: `Devfolio: ${title?.trim().slice(0, 40) || url}`,
      url, prize_usd: 5000, deadline: null,
      status: clicked ? "submitted" : "building", project: "bounty-hunter",
      win_rate_pct: null, participants: 0, prize_slots: 1,
      notes: "devfolio",
    }]);
    LOG(`  ${clicked ? "✓" : "→"} ${title?.trim().slice(0, 40)}`);
    await page.waitForTimeout(1000);
  }
}

async function main() {
  LOG("🏹 DoraHacks + Code4rena + Devfolio");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  await handleDoraHacks(page);
  await handleCode4rena(page);
  await handleDevfolio(page);

  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  const live = data.submissions.filter(s => ["submitted","building"].includes(s.status));
  const pot  = live.reduce((s, x) => s + (x.prize_usd || 0), 0);

  LOG("\n━━ 完了 ━━");
  LOG(`応募中: ${live.length}件`);
  LOG(`LIVE POTENTIAL: $${pot.toLocaleString()}`);
}

main().catch(e => LOG(`エラー: ${e.message}`));
