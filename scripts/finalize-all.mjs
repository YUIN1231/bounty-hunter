import { chromium } from "playwright";

const GITHUB = "https://github.com/YUIN1231/bounty-hunter";
const DESC = `## Inspiration
Prize opportunities are scattered across dozens of platforms. Developers miss thousands of dollars simply because they don't have time to check every platform daily.

## What it does
Bounty Hunter automatically scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX for prize opportunities, scores them with Claude AI (0-100), and surfaces the highest-value ones in a clean dashboard. One-click scan returns AI-ranked results in under 5 seconds.

## How we built it
- Next.js 16 (App Router) — dashboard and API routes
- Claude AI (Haiku) — intelligent opportunity scoring
- Parallel async scrapers — 5 platforms simultaneously
- Tailwind CSS v4 — clean UI

## Accomplishments
Sub-5-second full scan returning AI-ranked results from 5 platforms simultaneously.

## What's next
Auto-apply to hackathons and Slack/email alerts for high-value opportunities.

GitHub: ${GITHUB}`;

const SUBS = [
  { h: "30320-hyperbloom-summer-hackathon",                                  s: "1063171" },
  { h: "29624-uipath-agenthack",                                             s: "1063173" },
  { h: "30086-reddit-s-games-with-a-hook-hackathon",                         s: "1063174" },
  { h: "30520-pinch-me-i-want-50k",                                          s: "1063175" },
  { h: "29812-h0-hack-the-zero-stack-with-vercel-v0-and-aws-databases",      s: "1063176" },
  { h: "30161-open-atlas-ai-for-social-good-hackathon-2026",                 s: "1063177" },
  { h: "27959-india-high-school-exoplanet-data-challenge",                   s: "1063178" },
  { h: "30218-arm-create-ai-optimization-challenge",                         s: "1063179" },
];

async function setSelect2(page, tags) {
  await page.evaluate((tags) => {
    const el = document.getElementById("software_tag_list");
    if (!el) return;
    if (typeof jQuery !== "undefined" && jQuery(el).data("select2")) {
      jQuery(el).val(tags.join(",")).trigger("change");
    } else {
      el.value = tags.join(",");
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, tags).catch(() => {});
}

async function go(page, sub) {
  const base = `https://devpost.com/submit-to/${sub.h}/manage/submissions/${sub.s}-bounty-hunter-ai-prize-intelligence`;

  // Step: project_details
  await page.goto(base + "/project_details/edit", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (page.url().includes("project_details")) {
    const d = page.locator('textarea[name="software[description]"]').first();
    if (await d.count() > 0) {
      const v = await d.inputValue().catch(() => "");
      if (!v || v.startsWith("## Inspiration\n\n## What it does\n\n## How")) await d.fill(DESC);
    }
    const u = page.locator('input[type=url], input[name*="[url]"]').first();
    if (await u.count() > 0 && !(await u.inputValue().catch(() => ""))) await u.fill(GITHUB);
    await setSelect2(page, ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS", "Node.js"]);
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save"), input[type=submit]').first();
    if (await saveBtn.count() > 0) await saveBtn.click();
    await page.waitForTimeout(3000);
  }

  // finalization: loop through up to 5 times
  for (let i = 0; i < 5; i++) {
    await page.goto(base + "/finalization", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const url = page.url();
    if (/software\//.test(url)) return true;
    if (!url.includes("finalization") && !url.includes("manage/submissions")) break;

    // Check the ToS checkbox with native Playwright
    const cb = page.locator("#participants_manage_finalization_accepts_terms");
    if (await cb.count() > 0) {
      await cb.check({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Click submit with native Playwright
    const btn = page.locator('button[type=submit]').first();
    if (await btn.count() > 0) {
      await btn.click({ force: true });
      try {
        await page.waitForNavigation({ timeout: 8000, waitUntil: "domcontentloaded" });
      } catch {}
      await page.waitForTimeout(2000);
    }

    if (/software\//.test(page.url())) return true;
  }
  return false;
}

async function main() {
  console.log("Connecting to Chrome...");
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  let ok = 0;

  for (const sub of SUBS) {
    const name = sub.h.split("-").slice(1, 4).join(" ");
    process.stdout.write(`${name}: `);
    try {
      const done = await go(page, sub);
      ok += done ? 1 : 0;
      console.log(done ? "✅" : `⚠ ${page.url().slice(0, 50)}`);
    } catch (e) {
      console.log("✗", e.message?.slice(0, 50));
    }
    await page.waitForTimeout(500);
  }
  console.log(`\n完了: ${ok}/${SUBS.length}件`);
}

main().catch(console.error);
