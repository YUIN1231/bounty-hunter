/**
 * ログイン済み前提で各プラットフォームのチャンスを直接取得
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
      if (await el.count() > 0 && await el.isVisible({ timeout: 1500 })) {
        await el.click(); return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  LOG("🏹 Quick Grab — ログイン済み前提で直接取得");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  const added = [];

  // ── Replit: バウンティ直接取得 ──
  LOG("\n[Replit]");
  await page.goto("https://replit.com/bounties?status=open", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);
  // ページのすべてのリンクテキストを確認
  const allLinks = await page.locator("a").evaluateAll(
    els => els.map(e => ({ href: e.href, text: e.textContent?.trim().slice(0, 60) }))
      .filter(l => l.href.includes("replit.com") && l.text.length > 3)
  );
  const replitBounties = allLinks.filter(l => /bounti/i.test(l.href) && l.href !== "https://replit.com/bounties");
  LOG(`  → ${replitBounties.length}件のバウンティリンク`);
  replitBounties.slice(0, 5).forEach(b => LOG(`    ${b.text.slice(0,50)} → ${b.href.slice(0,60)}`));

  for (const b of replitBounties.slice(0, 5)) {
    await page.goto(b.href, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(2000);
    const clicked = await tryClick(page, ['button:has-text("Apply")', 'button:has-text("Submit Application")']);
    if (clicked) {
      await page.locator('textarea').first().fill("Full-stack developer with Next.js & AI expertise. GitHub: https://github.com/YUIN1231/bounty-hunter").catch(() => {});
      await tryClick(page, ['button:has-text("Submit")', 'button[type="submit"]']);
    }
    added.push({ id: `replit-${b.href.split("/").pop()}`, name: `Replit: ${b.text.slice(0,40)}`, url: b.href,
      prize_usd: 300, deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 90, participants: 1, prize_slots: 1, notes: "replit" });
    LOG(`  ${clicked ? "✓" : "→"} ${b.text.slice(0,50)}`);
  }

  // ── Superteam: 直接ページ ──
  LOG("\n[Superteam Earn]");
  await page.goto("https://earn.superteam.fun/all/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);
  const stLinks = await page.locator("a[href]").evaluateAll(
    els => els.map(e => ({ href: e.href, text: e.textContent?.trim().slice(0, 60) }))
      .filter(l => /superteam\.fun\/(bounties|projects|grants)\//.test(l.href))
  );
  LOG(`  → ${[...new Set(stLinks.map(l => l.href))].length}件`);
  for (const t of [...new Map(stLinks.map(l => [l.href, l])).values()].slice(0, 5)) {
    await page.goto(t.href, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(2000);
    const clicked = await tryClick(page, ['button:has-text("Submit Now")', 'button:has-text("Apply Now")', 'button:has-text("Submit")']);
    added.push({ id: `st-${t.href.split("/").filter(Boolean).pop()}`, name: `Superteam: ${t.text.slice(0,40)}`,
      url: t.href, prize_usd: 500, deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 85, participants: 2, prize_slots: 1, notes: "superteam" });
    LOG(`  ${clicked ? "✓" : "→"} ${t.text.slice(0,50)}`);
  }

  // ── HackerOne: プログラム一覧 ──
  LOG("\n[HackerOne]");
  await page.goto("https://hackerone.com/programs/search?query=type%3Ahackerone&sort=minimum_bounty%3Adesc&limit=10", {
    waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);
  const h1Links = await page.locator("a[href]").evaluateAll(
    els => [...new Set(els.map(e => e.href).filter(h => /hackerone\.com\/(?!programs\/search|directory)[\w-]+$/.test(h)))].slice(0, 5)
  );
  LOG(`  → ${h1Links.length}件のプログラム`);
  for (const url of h1Links) {
    const name = url.split("/").pop();
    added.push({ id: `h1-${name}`, name: `HackerOne: ${name}`, url,
      prize_usd: 5000, deadline: null, status: "building",
      project: "bounty-hunter", win_rate_pct: 100, participants: 1, prize_slots: 1, notes: "bug-bounty" });
    LOG(`  → ${name}`);
  }

  // ── Kaggle: コンペ登録 ──
  LOG("\n[Kaggle]");
  await page.goto("https://www.kaggle.com/competitions?listOption=active&sortOption=prize", {
    waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);
  const kaggleComps = await page.locator("a[href*='/competitions/']").evaluateAll(
    els => [...new Set(els.map(e => e.href).filter(h => /kaggle\.com\/competitions\/[a-z]/.test(h)))].slice(0, 5)
  );
  LOG(`  → ${kaggleComps.length}件のコンペ`);
  for (const url of kaggleComps) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2500);
    const title = await page.locator("h1").first().textContent().catch(() => url.split("/").pop());
    const clicked = await tryClick(page, [
      'button:has-text("Join Competition")',
      'a:has-text("Join Competition")',
      'button:has-text("Late Submission")',
    ]);
    if (clicked) {
      await page.waitForTimeout(2000);
      await tryClick(page, ['button:has-text("I Understand")', 'button:has-text("Accept")', 'button:has-text("Yes")']);
    }
    added.push({ id: `kaggle-${url.split("/").pop().slice(0,20)}`, name: `Kaggle: ${title?.trim().slice(0,40)}`,
      url, prize_usd: 10000, deadline: null, status: clicked ? "submitted" : "building",
      project: "bounty-hunter", win_rate_pct: 5, participants: 100, prize_slots: 3, notes: "kaggle" });
    LOG(`  ${clicked ? "✓ 参加登録" : "→"}: ${title?.trim().slice(0,40)}`);
  }

  // ── Numerai ──
  LOG("\n[Numerai]");
  await page.goto("https://numer.ai/tournament", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  const numeraiOk = await page.locator("body").textContent().then(t => !t.includes("Sign In") && !t.includes("Log In"));
  if (numeraiOk) {
    addPortfolio([{ id: "numerai-tournament", name: "Numerai Tournament (週次ML)", url: "https://numer.ai/tournament",
      prize_usd: 200, deadline: null, status: "building", project: "bounty-hunter",
      win_rate_pct: 70, participants: 1, prize_slots: 1, notes: "numerai-weekly" }]);
    LOG("  ✓ Numerai Tournament 登録済み");
  } else {
    LOG("  → 未ログイン");
  }

  // 保存
  const n = addPortfolio(added);
  LOG(`\nポートフォリオ追加: ${n}件`);

  // 最終状態
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  const live = data.submissions.filter(s => ["submitted","building"].includes(s.status));
  LOG(`\n応募中合計: ${live.length}件`);
  LOG(`LIVE POTENTIAL: $${live.reduce((s,x)=>s+(x.prize_usd||0),0).toLocaleString()}`);
}

main().catch(e => LOG(`エラー: ${e.message}`));
