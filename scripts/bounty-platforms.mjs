/**
 * 全賞金プラットフォーム登録 + タスク申請
 * Replit Bounties / Superteam Earn / Topcoder / Numerai / Kaggle / HackerOne
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");

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

async function ensureLogin(page, loginUrl, successPattern, label) {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  if (page.url().match(successPattern)) { LOG(`  ✓ ${label} ログイン済み`); return true; }
  LOG(`  → ${label} ログインしてください（5分）`);
  try {
    await page.waitForURL(successPattern, { timeout: 300000 });
    LOG(`  ✓ ログイン確認`); return true;
  } catch { LOG(`  ✗ タイムアウト`); return false; }
}

// ── 1. Replit Bounties ──────────────────────────────────────
async function handleReplit(page) {
  LOG("\n━━ [1/6] REPLIT BOUNTIES ━━");
  await page.goto("https://replit.com/bounties?status=open&order=creationDateDescending", {
    waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // ログイン確認
  const loggedIn = await page.locator('[data-cy="user-menu"], .user-avatar, a[href*="/~"]').count() > 0;
  if (!loggedIn) {
    LOG("  → Replit ログインしてください（5分）");
    await page.goto("https://replit.com/login");
    try { await page.waitForURL(/replit\.com\/(?!login)/, { timeout: 300000 }); LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return []; }
    await page.goto("https://replit.com/bounties?status=open&order=creationDateDescending", {
      waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
  } else { LOG("  ✓ ログイン済み"); }

  // バウンティ一覧取得
  const bounties = await page.locator('a[href*="/bounties/"]').evaluateAll(
    els => [...new Map(els.map(e => [e.href, {
      href: e.href,
      text: e.closest('[class*="bounty"], [class*="card"], li')?.textContent?.trim().slice(0, 80) || e.textContent?.trim().slice(0, 80)
    }])).values()].filter(b => /\/bounties\/\d/.test(b.href)).slice(0, 8)
  );

  LOG(`  → ${bounties.length}件のバウンティを確認`);
  const added = [];

  for (const b of bounties) {
    await page.goto(b.href, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    // 金額取得
    const priceText = await page.locator('[class*="bounty-price"], [class*="cycles"], [class*="reward"]').first().textContent().catch(() => "0");
    const prize = parseInt(priceText.replace(/[^0-9]/g, "") || "0");

    // Apply ボタン
    const clicked = await tryClick(page, [
      'button:has-text("Apply")',
      'button:has-text("Submit Application")',
      'a:has-text("Apply")',
    ]);

    if (clicked) {
      await page.waitForTimeout(1500);
      // 申請フォームに簡単なメッセージ
      await page.locator('textarea').first().fill(
        "I'm a full-stack developer with Next.js and AI expertise. I can complete this quickly and efficiently. GitHub: https://github.com/YUIN1231/bounty-hunter"
      ).catch(() => {});
      await tryClick(page, ['button:has-text("Submit")', 'button[type="submit"]']);
      LOG(`  ✓ 申請: $${prize} — ${b.href.split("/").pop()}`);
    } else {
      LOG(`  → 確認: ${b.href.split("/").pop()}`);
    }

    added.push({
      id: `replit-${b.href.split("/").pop()}`,
      name: `Replit Bounty: ${b.text?.slice(0, 40) || b.href.split("/").pop()}`,
      url: b.href,
      prize_usd: prize || 200,
      deadline: null,
      status: clicked ? "submitted" : "building",
      project: "bounty-hunter",
      win_rate_pct: 90,
      participants: 1,
      prize_slots: 1,
      notes: "replit-bounty",
    });
    await page.waitForTimeout(1000);
  }

  addPortfolio(added);
  LOG(`  → ポートフォリオに${added.length}件追加`);
  return added;
}

// ── 2. Superteam Earn ───────────────────────────────────────
async function handleSuperteam(page) {
  LOG("\n━━ [2/6] SUPERTEAM EARN ━━");
  await page.goto("https://earn.superteam.fun/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  const loggedIn = await page.locator('[class*="avatar"], [class*="user-menu"], a[href*="/profile"]').count() > 0;
  if (!loggedIn) {
    LOG("  → Superteam ログインしてください（5分）");
    try { await page.waitForURL(/earn\.superteam\.fun(?!.*login)/, { timeout: 300000 });
      LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return []; }
  } else { LOG("  ✓ ログイン済み"); }

  // バウンティ一覧
  await page.goto("https://earn.superteam.fun/all/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const tasks = await page.locator('a[href*="/bounties/"], a[href*="/projects/"]').evaluateAll(
    els => [...new Map(els.map(e => [e.href, { href: e.href,
      text: e.closest('article, [class*="card"], li')?.textContent?.trim().slice(0, 80) || e.textContent?.trim().slice(0, 60)
    }])).values()].slice(0, 6)
  );

  LOG(`  → ${tasks.length}件のタスク`);
  const added = [];

  for (const t of tasks.filter(t => t.href)) {
    await page.goto(t.href, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    const priceText = await page.locator('[class*="reward"], [class*="prize"], [class*="usd"]').first().textContent().catch(() => "0");
    const prize = parseInt(priceText.replace(/[^0-9]/g, "") || "0");

    const clicked = await tryClick(page, [
      'button:has-text("Submit Now")',
      'button:has-text("Apply Now")',
      'button:has-text("Submit")',
      'a:has-text("Submit")',
    ]);

    LOG(`  ${clicked ? "✓ 申請" : "→ 確認"}: $${prize} — ${t.href.split("/").filter(Boolean).pop()}`);
    added.push({
      id: `superteam-${t.href.split("/").filter(Boolean).pop()}`,
      name: `Superteam: ${t.text?.slice(0, 40) || "Task"}`,
      url: t.href, prize_usd: prize || 500,
      deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 85, participants: 2, prize_slots: 1,
      notes: "superteam-earn",
    });
    await page.waitForTimeout(1000);
  }

  addPortfolio(added);
  LOG(`  → ${added.length}件追加`);
  return added;
}

// ── 3. Topcoder ─────────────────────────────────────────────
async function handleTopcoder(page) {
  LOG("\n━━ [3/6] TOPCODER ━━");
  await page.goto("https://www.topcoder.com/challenges/?tracks[]=Dev&orderBy=prize&orderByDir=desc&status=Active", {
    waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(4000);

  const loggedIn = await page.locator('.nav-user, [class*="user-dropdown"], a[href*="/members/"]').count() > 0;
  if (!loggedIn) {
    LOG("  → Topcoder ログインしてください（5分）");
    await page.goto("https://accounts.topcoder.com/member?retUrl=https://topcoder.com");
    try { await page.waitForURL(/topcoder\.com(?!.*accounts)/, { timeout: 300000 });
      LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return []; }
    await page.goto("https://www.topcoder.com/challenges/?tracks[]=Dev&orderBy=prize&orderByDir=desc", {
      waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
  } else { LOG("  ✓ ログイン済み"); }

  const links = await page.locator('a[href*="/challenges/"]').evaluateAll(
    els => [...new Set(els.map(e => e.href))].filter(h => /\/challenges\/[a-f0-9-]{30,}/.test(h)).slice(0, 5)
  );

  LOG(`  → ${links.length}件のチャレンジ`);
  const added = [];

  for (const link of links) {
    await page.goto(link, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    const title = await page.locator('h1, [class*="challenge-title"]').first().textContent().catch(() => link.split("/").pop());
    const prizeText = await page.locator('[class*="prize"], [class*="reward"]').first().textContent().catch(() => "0");
    const prize = parseInt(prizeText.replace(/[^0-9]/g, "") || "0");

    const clicked = await tryClick(page, [
      'button:has-text("Register")',
      'a:has-text("Register")',
      'button:has-text("Submit")',
    ]);

    LOG(`  ${clicked ? "✓ 登録" : "→ 確認"}: $${prize} — ${title?.trim().slice(0, 40)}`);
    added.push({
      id: `topcoder-${link.split("/").pop().slice(0, 20)}`,
      name: `Topcoder: ${title?.trim().slice(0, 40) || "Challenge"}`,
      url: link, prize_usd: prize || 1000,
      deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 30, participants: 3, prize_slots: 1,
      notes: "topcoder",
    });
    await page.waitForTimeout(1000);
  }

  addPortfolio(added);
  LOG(`  → ${added.length}件追加`);
  return added;
}

// ── 4. Numerai ──────────────────────────────────────────────
async function handleNumerai(page) {
  LOG("\n━━ [4/6] NUMERAI (週次ML報酬) ━━");
  await page.goto("https://numer.ai/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  const loggedIn = await page.locator('.profile-avatar, [data-testid="user-menu"]').count() > 0;
  if (!loggedIn) {
    LOG("  → Numerai ログインしてください（5分）");
    await page.goto("https://numer.ai/login");
    try { await page.waitForURL(/numer\.ai(?!\/login)/, { timeout: 300000 });
      LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return; }
  } else { LOG("  ✓ ログイン済み"); }

  await page.goto("https://numer.ai/tournament", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  LOG("  → Numerai Tournament 確認（毎週提出で報酬あり）");
  addPortfolio([{
    id: "numerai-tournament",
    name: "Numerai Tournament (週次ML)",
    url: "https://numer.ai/tournament",
    prize_usd: 200,
    deadline: null,
    status: "building",
    project: "bounty-hunter",
    win_rate_pct: 70,
    participants: 1,
    prize_slots: 1,
    notes: "numerai-weekly",
  }]);
}

// ── 5. HackerOne ────────────────────────────────────────────
async function handleHackerOne(page) {
  LOG("\n━━ [5/6] HACKERONE ━━");
  await page.goto("https://hackerone.com/users/sign_in", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  const loggedIn = await page.locator('.header--user, .current-user, a[href*="/logout"]').count() > 0;
  if (!loggedIn) {
    LOG("  → HackerOne ログインしてください（5分）");
    try { await page.waitForURL(/hackerone\.com(?!.*sign_in)/, { timeout: 300000 });
      LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return; }
  } else { LOG("  ✓ ログイン済み"); }

  // 高報酬プログラム確認
  await page.goto("https://hackerone.com/programs/search?query=type%3Ahackerone&sort=minimum_bounty%3Adesc&limit=10", {
    waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const programs = await page.locator('.program-card a, [data-testid="program-card"] a').evaluateAll(
    els => [...new Set(els.map(e => e.href))].filter(h => /hackerone\.com\/[a-z]/.test(h)).slice(0, 5)
  );

  LOG(`  → ${programs.length}件のプログラム確認`);
  const added = programs.map((url, i) => ({
    id: `h1-prog-${url.split("/").pop().slice(0, 20)}`,
    name: `HackerOne: ${url.split("/").pop()}`,
    url, prize_usd: 5000,
    deadline: null, status: "building",
    project: "bounty-hunter", win_rate_pct: 100, participants: 1, prize_slots: 1,
    notes: "bug-bounty",
  }));
  addPortfolio(added);
  LOG(`  → ${added.length}件追加（バグを見つければ確実報酬）`);
}

// ── 6. Kaggle ───────────────────────────────────────────────
async function handleKaggle(page) {
  LOG("\n━━ [6/6] KAGGLE ━━");
  await page.goto("https://www.kaggle.com/competitions?listOption=active&sortOption=prize", {
    waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  const loggedIn = await page.locator('[data-component-name="UserAvatar"], .site-header__user').count() > 0;
  if (!loggedIn) {
    LOG("  → Kaggle ログインしてください（5分）");
    await page.goto("https://www.kaggle.com/account/login");
    try { await page.waitForURL(/kaggle\.com(?!.*login)/, { timeout: 300000 });
      LOG("  ✓ ログイン"); }
    catch { LOG("  ✗ スキップ"); return; }
    await page.goto("https://www.kaggle.com/competitions?listOption=active&sortOption=prize", {
      waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
  } else { LOG("  ✓ ログイン済み"); }

  const comps = await page.locator('a[href*="/competitions/"]').evaluateAll(
    els => [...new Set(els.map(e => e.href))].filter(h => /\/competitions\/[a-z]/.test(h)).slice(0, 5)
  );

  LOG(`  → ${comps.length}件のコンペ`);
  const added = [];

  for (const url of comps) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);

    const title = await page.locator('h1').first().textContent().catch(() => url.split("/").pop());
    const clicked = await tryClick(page, [
      'button:has-text("Join Competition")',
      'a:has-text("Join Competition")',
      'button:has-text("Late Submission")',
    ]);

    if (clicked) {
      await page.waitForTimeout(2000);
      await tryClick(page, ['button:has-text("I Understand")', 'button:has-text("Accept")', 'button:has-text("Continue")']);
      LOG(`  ✓ 参加登録: ${title?.trim().slice(0, 40)}`);
    } else {
      LOG(`  → 確認: ${title?.trim().slice(0, 40)}`);
    }

    added.push({
      id: `kaggle-${url.split("/").pop().slice(0, 20)}`,
      name: `Kaggle: ${title?.trim().slice(0, 40) || url.split("/").pop()}`,
      url, prize_usd: 10000,
      deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 5, participants: 100, prize_slots: 3,
      notes: "kaggle",
    });
    await page.waitForTimeout(1000);
  }

  addPortfolio(added);
  LOG(`  → ${added.length}件追加`);
}

async function main() {
  LOG("🏹 全賞金プラットフォーム登録開始");
  LOG("Replit / Superteam / Topcoder / Numerai / HackerOne / Kaggle\n");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  await handleReplit(page);
  await handleSuperteam(page);
  await handleTopcoder(page);
  await handleNumerai(page);
  await handleHackerOne(page);
  await handleKaggle(page);

  // 最終状態
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  const live = data.submissions.filter(s => ["submitted","building"].includes(s.status));
  const pot  = live.reduce((s, x) => s + (x.prize_usd || 0), 0);
  const p98  = Math.ceil(Math.log(0.02) / Math.log(1 - 0.008));

  LOG("\n━━━━━━ 完了 ━━━━━━");
  LOG(`応募中: ${live.length}件`);
  LOG(`LIVE POTENTIAL: $${pot.toLocaleString()}`);
  LOG(`98%目標まで: あと約${Math.max(0, p98 - live.length)}本`);
}

main().catch(console.error);
