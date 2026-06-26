/**
 * 今開いているDevpostフォームに自動入力
 */
import { chromium } from "playwright";

const GITHUB = "https://github.com/YUIN1231/bounty-hunter";
const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

const CONTENTS = {
  title: "Bounty Hunter — AI-Powered Prize Intelligence",
  tagline: "Automated prize discovery across 5 platforms, ranked by Claude AI.",
  description: `Bounty Hunter automatically scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX for prize opportunities, scores them with Claude AI, and surfaces the highest-value ones in a clean dashboard.

One-click scan returns AI-ranked results in under 5 seconds. Built with Next.js 16, TypeScript, Tailwind CSS, and Claude Haiku.

Features:
- Parallel scraping of 5 platforms simultaneously
- Claude AI scores each opportunity 0-100 (prize value, deadline urgency, solo eligibility)
- Real-time dashboard with filter by category, prize floor, deadline
- Daily auto-scan via scheduled pipeline
- GitLab CI/CD integration for automated deployment

GitHub: ${GITHUB}`,
  builtWith: ["Next.js", "TypeScript", "Claude AI", "Tailwind CSS", "Node.js"],
  url: GITHUB,
};

async function tryFill(page, sels, val) {
  for (const s of sels) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
        await el.click({ force: true });
        await page.waitForTimeout(300);
        await el.fill(val);
        LOG(`  ✓ 入力: ${s.slice(0, 40)} → "${val.slice(0, 30)}..."`);
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

async function main() {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];

  // 全タブを確認してDevpostのsubmissionページを探す
  const pages = context.pages();
  LOG(`開いているタブ: ${pages.length}件`);

  let targetPage = null;
  for (const p of pages) {
    const url = p.url();
    LOG(`  タブ: ${url.slice(0, 80)}`);
    if (/devpost\.com/.test(url)) {
      targetPage = p;
      LOG(`  → Devpostタブを発見: ${url}`);
    }
  }

  if (!targetPage) {
    LOG("DevpostのタブがChromeで開いていません");
    process.exit(1);
  }

  await targetPage.bringToFront();
  await targetPage.waitForTimeout(1000);

  const currentUrl = targetPage.url();
  LOG(`現在のURL: ${currentUrl}`);

  // どのハッカソンか判定して説明文を選択
  let desc = CONTENTS.description;
  let title = CONTENTS.title;
  let tagline = CONTENTS.tagline;

  if (/easygo|kick/i.test(currentUrl)) {
    tagline = "The missing tool for enterprise dev teams: track every prize opportunity before competitors do.";
  } else if (/h0[1-9]|vercel|zero-stack/i.test(currentUrl)) {
    tagline = "Full-stack prize discovery platform built with the zero-stack philosophy.";
  } else if (/uipath|agent/i.test(currentUrl)) {
    tagline = "An autonomous AI agent that hunts prize money across the internet.";
  } else if (/moonshot/i.test(currentUrl)) {
    tagline = "The moonshot: make prize hunting a viable full-time income for solo developers.";
  } else if (/slack/i.test(currentUrl)) {
    tagline = "AI-ranked bounty opportunities delivered to your Slack channel every morning.";
  } else if (/reddit/i.test(currentUrl)) {
    tagline = "A game that turns prize hunting into a fun, competitive daily habit.";
  } else if (/qwen|alibaba/i.test(currentUrl)) {
    tagline = "Multi-source AI agent dispatching scrapers to 5 platforms simultaneously.";
  }

  LOG("\n入力開始...");

  // タイトル
  await tryFill(targetPage, [
    'input[name="submission[title]"]',
    '#submission_title',
    'input[placeholder*="title" i]',
    'input[placeholder*="project name" i]',
  ], title);

  // タグライン
  await tryFill(targetPage, [
    'input[name="submission[tagline]"]',
    '#submission_tagline',
    'input[placeholder*="tagline" i]',
    'input[placeholder*="one-liner" i]',
  ], tagline);

  // 説明文
  await tryFill(targetPage, [
    'textarea[name="submission[description]"]',
    '#submission_description',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="tell us" i]',
    '.CodeMirror textarea',
  ], desc);

  // Try URL
  await tryFill(targetPage, [
    'input[name="submission[url]"]',
    'input[placeholder*="github" i]',
    'input[placeholder*="project url" i]',
    'input[placeholder*="try it" i]',
    'input[placeholder*="website" i]',
    'input[placeholder*="demo" i]',
  ], GITHUB);

  // Video URL (空でもOK、でも入れてみる)
  await tryFill(targetPage, [
    'input[name="submission[video_url]"]',
    'input[placeholder*="video" i]',
    'input[placeholder*="youtube" i]',
  ], "").catch(() => {});

  // Built with タグ
  LOG("  Built with タグ入力中...");
  for (const tech of CONTENTS.builtWith) {
    const ok = await tryFill(targetPage, [
      'input[placeholder*="built with" i]',
      '#submission_built_with_tag',
      'input[name*="built_with"]',
      '.built-with-tags input',
    ], tech);
    if (ok) {
      await targetPage.keyboard.press("Enter");
      await targetPage.waitForTimeout(500);
    }
  }

  // ページの全inputを表示（デバッグ用）
  const inputs = await targetPage.locator("input[type='text'], input[type='url'], textarea").evaluateAll(
    els => els.map(e => ({ name: e.name, placeholder: e.placeholder, id: e.id, value: e.value?.slice(0, 30) }))
  );
  LOG(`\n現在のフォームフィールド (${inputs.length}件):`);
  inputs.forEach(i => LOG(`  name="${i.name}" placeholder="${i.placeholder}" id="${i.id}" value="${i.value}"`));

  // Save ボタン
  LOG("\nSaveボタンを探しています...");
  const saved = await tryClick(targetPage, [
    'button:has-text("Save & continue")',
    'button:has-text("Save")',
    'button:has-text("Next")',
    'input[type="submit"][value*="Save"]',
    'input[type="submit"]',
    'button[type="submit"]:not(:has-text("Cancel"))',
  ]);

  if (saved) {
    LOG("✅ 保存ボタンをクリックしました");
  } else {
    LOG("⚠ 保存ボタンが見つかりません — 手動でSaveを押してください");
  }

  LOG("\n完了");
}

main().catch(e => LOG(`エラー: ${e.message}`));
