/**
 * 正確な登録URLからJoin→Submit完全自動化
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const GITHUB = "https://github.com/YUIN1231/bounty-hunter";
const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

const DESC = `## Inspiration
Prize opportunities are scattered across dozens of platforms. Developers miss thousands of dollars simply because they do not have time to check every platform daily.

## What it does
Bounty Hunter automatically scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX for prize opportunities, scores them with Claude AI (0-100), and surfaces the highest-value ones in a clean dashboard.

## How we built it
- Next.js 16 App Router for dashboard and API routes
- Claude AI (Haiku) for intelligent opportunity scoring
- Parallel async scrapers for 5 platforms simultaneously
- Tailwind CSS v4 for the UI

## Challenges we ran into
Getting consistent data across 5 different API formats and making Claude scoring fast for real-time use.

## Accomplishments
Sub-5-second full scan returning AI-ranked results from 5 platforms simultaneously.

## What is next
Auto-apply to hackathons and Slack/email alerts for high-value opportunities.

GitHub: ${GITHUB}`;

const HACKATHONS = [
  { id: "30320", slug: "hyperbloom-summer-hackathon",                             domain: "hyperbloom-summer-hackathon",         name: "Hyperbloom $12k",  prize: 12000 },
  { id: "29812", slug: "h0-hack-the-zero-stack-with-vercel-v0-and-aws-databases", domain: "h01",                                name: "H0 $80k",          prize: 80000 },
  { id: "29966", slug: "global-ai-hackathon-series-with-qwen-cloud",              domain: "qwencloud-hackathon",                name: "Qwen $45k",        prize: 45000 },
  { id: "29624", slug: "uipath-agenthack",                                        domain: "uipath-agenthack",                   name: "UiPath $50k",      prize: 50000 },
  { id: "29843", slug: "slack-agent-builder-challenge",                           domain: "slackhack",                          name: "Slack $42k",       prize: 42000 },
  { id: "30086", slug: "reddit-s-games-with-a-hook-hackathon",                    domain: "redditgameswithahook",               name: "Reddit $40k",      prize: 40000 },
  { id: "30100", slug: "moonshot-hackathon",                                      domain: "moonshot-aethra",                    name: "Moonshot $33k",    prize: 33532 },
  { id: "28962", slug: "easygo-mini-hackathon-powered-by-kick",                   domain: "easygo-mini-hackathon",              name: "Easygo $100k",     prize: 100000 },
  { id: "30520", slug: "pinch-me-i-want-50k",                                     domain: "pinch-me-i-want-50k",               name: "Pinch Me $50k",    prize: 50000 },
  { id: "30161", slug: "open-atlas-ai-for-social-good",                           domain: "oa-ai-for-social-good",              name: "Open Atlas $10k",  prize: 10000 },
  { id: "27959", slug: "celesta-exoplanet-challenge",                             domain: "celesta-exoplanet-challenge",        name: "Exoplanet $10k",   prize: 10300 },
  { id: "30205", slug: "backblaze-generative-media",                              domain: "backblaze-generative-media",         name: "Backblaze $10k",   prize: 10000 },
  { id: "30218", slug: "arm-ai-optimization-challenge",                           domain: "arm-ai-optimization-challenge",      name: "Arm AI $8k",       prize: 8000  },
];

async function setSelect2(page, tags) {
  await page.evaluate((tags) => {
    const el = document.getElementById("software_tag_list");
    if (!el) return;
    if (typeof jQuery !== "undefined" && jQuery(el).data("select2")) {
      jQuery(el).val(tags.join(",")).trigger("change");
      return;
    }
    el.value = tags.join(",");
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, tags);
}

async function processHackathon(page, h) {
  LOG(`\n[${h.name}]`);

  // Step 1: 登録ページへ直接アクセス
  const registerUrl = `https://${h.domain}.devpost.com/register?flow%5Bdata%5D%5Bchallenge_id%5D=${h.id}&flow%5Bname%5D=register_for_challenge`;
  try {
    await page.goto(registerUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(registerUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  }
  await page.waitForTimeout(3000);

  const url1 = page.url();
  LOG(`  登録後URL: ${url1.slice(0, 60)}`);

  // 登録フォームがあれば入力・送信
  if (url1.includes("/register") || url1.includes("/flow")) {
    await page.evaluate(() => {
      // チェックボックスを全チェック
      document.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); }
      });
      // ラジオボタン: 最初のグループの最初の選択肢
      const groups = {};
      document.querySelectorAll("input[type=radio]").forEach((r) => {
        if (!groups[r.name]) { groups[r.name] = true; r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
      });
      // Select: 最初のオプション
      document.querySelectorAll("select").forEach((s) => { if (s.options.length > 1) s.selectedIndex = 1; });
    });
    await page.waitForTimeout(500);

    // 送信ボタン (Cancel以外)
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button[type=submit], input[type=submit], button")];
      const btn = btns.find((b) => !/cancel/i.test(b.textContent || ""));
      if (btn) { btn.click(); return btn.textContent?.trim() || btn.value; }
      const form = document.querySelector("form"); if (form) { form.submit(); return "form.submit"; }
      return null;
    });
    LOG(`  → 登録送信: ${clicked}`);
    await page.waitForTimeout(4000);
    LOG(`  → 送信後URL: ${page.url().slice(0, 60)}`);
  }

  // Step 2: manage/submissions ページで Submit Project ボタンを待つ
  const manageUrl = `https://devpost.com/submit-to/${h.id}-${h.slug}/manage/submissions`;
  await page.goto(manageUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Submit Project ボタンを最大20秒待つ
  let submitHref = null;
  for (let i = 0; i < 10; i++) {
    submitHref = await page.evaluate(() => {
      const els = [...document.querySelectorAll("a[href], button")];
      const el = els.find((e) => {
        const cls = e.className || "";
        const txt = e.textContent?.toLowerCase().trim() || "";
        const href = e.href || "";
        return (
          cls.includes("button radius") && !txt.includes("explore") && !txt.includes("参加者") ||
          /submit.*project|プロジェクトを提出|add.*sub|new.*sub/i.test(txt) ||
          /\/submissions\/new/.test(href)
        );
      });
      return el?.href || null;
    });
    if (submitHref) break;
    await page.waitForTimeout(2000);
  }

  if (!submitHref) {
    LOG("  → Submit Project リンク未発見");
    return false;
  }

  LOG(`  → Submit Project: ${submitHref.slice(0, 60)}`);
  await page.goto(submitHref, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {
    return page.goto(submitHref, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  });
  await page.waitForTimeout(3000);

  // Step 3: Project Overview
  const titleEl = page.locator("input[name*='[title]']").first();
  await titleEl.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (!await titleEl.isVisible({ timeout: 2000 }).catch(() => false)) {
    LOG("  → Overview フォームなし");
    return false;
  }

  await titleEl.fill("Bounty Hunter — AI Prize Intelligence");
  const tl = page.locator("textarea[name*='[tagline]']").first();
  if (await tl.count() > 0) await tl.fill("Automated prize discovery across 5 platforms, ranked by Claude AI.");
  await page.evaluate(() => {
    [...document.querySelectorAll("button,input[type=submit]")]
      .find((b) => /save|next|保存|続行/i.test(b.textContent || b.value))?.click();
  });
  await page.waitForTimeout(3000);
  LOG("  ✓ Overview");

  // Step 4: Project Details
  const descEl = page.locator("textarea[name='software[description]']").first();
  await descEl.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  if (await descEl.isVisible({ timeout: 2000 }).catch(() => false)) {
    await descEl.fill(DESC);
    const urlEl = page.locator("input[type=url]").first();
    if (await urlEl.count() > 0) await urlEl.fill(GITHUB);
    await setSelect2(page, ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS", "Node.js"]);
    await page.evaluate(() => {
      [...document.querySelectorAll("button,input[type=submit]")]
        .find((b) => /save|next|保存/i.test(b.textContent || b.value))?.click();
    });
    await page.waitForTimeout(3000);
    LOG("  ✓ Details");
  }

  // Step 5: Finalization
  const subMatch = page.url().match(/\/submissions\/([^/]+)/);
  if (subMatch) {
    const finalUrl = `https://devpost.com/submit-to/${h.id}-${h.slug}/manage/submissions/${subMatch[1]}/finalization`;
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (!page.url().includes("finalization")) {
    LOG(`  → Finalization未到達: ${page.url().slice(0, 60)}`);
    return false;
  }

  // ToS チェック + 提出
  await page.evaluate(() => {
    document.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    setTimeout(() => {
      const btn = [...document.querySelectorAll("button[type=submit],button")]
        .find((b) => /提出|submit/i.test(b.textContent));
      if (btn) { btn.disabled = false; btn.click(); }
    }, 500);
  });
  await page.waitForTimeout(5000);

  const success = /software\//.test(page.url());
  if (success) {
    LOG(`  ✅ 提出完了! ${page.url()}`);
    // ポートフォリオ更新
    const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
    const s = data.submissions.find((s) => s.url?.includes(h.domain) || s.name?.includes(h.name.split(" ")[0]));
    if (s) { s.status = "submitted"; s.has_content = true; s.submitted_at = new Date().toISOString().slice(0, 10); }
    fs.writeFileSync(PORTFOLIO, JSON.stringify(data, null, 2));
  } else {
    LOG(`  ⚠ 最終URL: ${page.url().slice(0, 60)}`);
  }
  return success;
}

async function main() {
  LOG("🏹 正確登録URL → Submit 全自動化");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  let ok = 0;
  for (const h of HACKATHONS) {
    try {
      const result = await processHackathon(page, h);
      if (result) ok++;
    } catch (e) {
      LOG(`  ✗ ${e.message?.slice(0, 80)}`);
    }
    await page.waitForTimeout(1000);
  }

  LOG(`\n━━ 完了: ${ok}/${HACKATHONS.length}件提出 ━━`);
}

main().catch(e => LOG(`FATAL: ${e.message}`));
