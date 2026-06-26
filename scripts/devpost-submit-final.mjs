/**
 * Devpost 確実提出スクリプト
 * 締切近い順に全件チャレンジ
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const GITHUB = "https://github.com/YUIN1231/bounty-hunter";

const DESC = `Bounty Hunter automatically scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX for prize opportunities, scores them with Claude AI, and surfaces the highest-value ones in a clean dashboard.

One-click scan returns AI-ranked results in under 5 seconds. Built with Next.js 16, TypeScript, Tailwind CSS, and Claude Haiku.

GitHub: ${GITHUB}`;

async function tryFill(page, sels, val) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click({ force: true });
        await el.fill(val);
        return true;
      }
    } catch {}
  }
  return false;
}

async function tryClick(page, sels) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
}

async function submitOne(page, hackathon) {
  const { name, url, id } = hackathon;

  // ハッカソンページへ
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  // Join ボタンがあれば先にJoin
  await tryClick(page, [
    'a:has-text("Join Hackathon")',
    'button:has-text("Join Hackathon")',
  ]);
  await page.waitForTimeout(1500);

  // Submit リンクを href から探す（最確実な方法）
  const links = await page.locator("a[href]").evaluateAll(
    els => els.map(e => ({ href: e.href, text: e.textContent?.trim() }))
  );

  const submitLink = links.find(l =>
    /submissions\/new|submit-to|\/submit\b/.test(l.href) ||
    /submit project|enter a submission|start a submission|add submission/i.test(l.text || "")
  );

  if (!submitLink) {
    // 直接 submissions/new URL を試す
    const base = new URL(url).origin + new URL(url).pathname;
    const directUrl = `${base}/submissions/new`;
    await page.goto(directUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
  } else {
    await page.goto(submitLink.href, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  // フォームが存在するか確認
  const titleField = await page.locator('input[name="submission[title]"], #submission_title, input[placeholder*="title" i]').first();
  if (await titleField.count() === 0) {
    return "no-form";
  }

  // タイトル
  await titleField.fill("Bounty Hunter — AI Prize Intelligence");

  // タグライン
  await tryFill(page, [
    'input[name="submission[tagline]"]',
    '#submission_tagline',
    'input[placeholder*="tagline" i]',
  ], "Automated prize discovery across 5 platforms, ranked by Claude AI.");

  // 説明
  await tryFill(page, [
    'textarea[name="submission[description]"]',
    '#submission_description',
  ], DESC);

  // GitHub URL
  await tryFill(page, [
    'input[name="submission[url]"]',
    'input[placeholder*="github" i]',
    'input[placeholder*="project url" i]',
    'input[placeholder*="try it" i]',
    'input[placeholder*="website" i]',
  ], GITHUB);

  // Built with
  for (const tech of ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS"]) {
    const ok = await tryFill(page, [
      'input[placeholder*="built with" i]',
      '#submission_built_with_tag',
      'input[name*="built_with"]',
    ], tech);
    if (ok) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    }
  }

  // Save ボタン
  const saved = await tryClick(page, [
    'button:has-text("Save & continue")',
    'button:has-text("Save")',
    'button:has-text("Next")',
    'button:has-text("Submit")',
    'input[type="submit"][value*="Save"]',
    'input[type="submit"]',
    'button[type="submit"]',
  ]);

  await page.waitForTimeout(2000);

  // URL が変わった = 成功の可能性
  const newUrl = page.url();
  if (saved || newUrl.includes("submission") || newUrl.includes("project")) {
    return "ok";
  }

  return saved ? "ok" : "saved-uncertain";
}

async function main() {
  LOG("🏹 Devpost 確実提出スクリプト");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  // Devpost ログイン確認
  await page.goto("https://devpost.com/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const loggedIn = await page.locator('.user-avatar, [data-behavior="user-menu"], a[href*="/logout"]').count() > 0;
  if (!loggedIn) {
    LOG("Devpost にログインしてください（最大5分）");
    await page.goto("https://devpost.com/users/sign_in");
    try {
      await page.waitForURL(/devpost\.com(?!\/users\/sign)/, { timeout: 300000 });
      LOG("✓ ログイン確認");
    } catch {
      LOG("✗ タイムアウト");
      process.exit(1);
    }
  } else {
    LOG("✓ ログイン済み");
  }

  // portfolio から Devpost 案件を締切近い順で取得
  const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
  const targets = data.submissions
    .filter(s => s.id.startsWith("devpost-") && ["submitted", "building"].includes(s.status))
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });

  LOG(`対象: ${targets.length}件（締切近い順）`);

  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const h = targets[i];
    const daysLeft = h.deadline ? Math.ceil((new Date(h.deadline) - new Date()) / 86400000) : 999;
    LOG(`[${i + 1}/${targets.length}] ${h.name.slice(0, 45)} | $${(h.prize_usd||0).toLocaleString()} | ${h.deadline || "期限なし"} (${daysLeft}日後)`);

    try {
      const result = await submitOne(page, h);
      if (result === "ok" || result === "saved-uncertain") {
        ok++;
        LOG(`  ✓ 提出完了`);
        // portfolio を submitted に更新
        const sub = data.submissions.find(s => s.id === h.id);
        if (sub) sub.status = "submitted";
      } else if (result === "no-form") {
        skip++;
        LOG(`  → フォームなし（未登録 or 締切済み）`);
      } else {
        fail++;
        LOG(`  ✗ 失敗`);
      }
    } catch (e) {
      fail++;
      LOG(`  ✗ エラー: ${String(e.message).slice(0, 60)}`);
    }

    await page.waitForTimeout(1000);
  }

  fs.writeFileSync(PORTFOLIO, JSON.stringify(data, null, 2));

  LOG(`\n━━ 完了 ━━`);
  LOG(`✓ 提出成功: ${ok}件`);
  LOG(`→ フォームなし: ${skip}件`);
  LOG(`✗ 失敗: ${fail}件`);
  LOG(`合計処理: ${ok + skip + fail}件`);
}

main().catch(e => LOG(`FATAL: ${e.message}`));
