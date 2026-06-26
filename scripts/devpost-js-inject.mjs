/**
 * Devpost JS直接注入で提出
 * React状態を操作してフォームを送信
 */
import { chromium } from "playwright";
const GITHUB = "https://github.com/YUIN1231/bounty-hunter";
const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

const HACKATHONS = [
  { url: "https://easygo-mini-hackathon.devpost.com/", name: "Easygo $100k" },
  { url: "https://h01.devpost.com/", name: "H0 $80k" },
  { url: "https://uipath-agenthack.devpost.com/", name: "UiPath $50k" },
  { url: "https://moonshot-aethra.devpost.com/", name: "Moonshot $33k" },
  { url: "https://qwencloud-hackathon.devpost.com/", name: "Qwen $45k" },
  { url: "https://slackhack.devpost.com/", name: "Slack $42k" },
  { url: "https://redditgameswithahook.devpost.com/", name: "Reddit $40k" },
  { url: "https://pinch-me-i-want-50k.devpost.com/", name: "Pinch Me $50k" },
  { url: "https://hyperbloom-summer-hackathon.devpost.com/", name: "Hyperbloom $12k" },
  { url: "https://sns-bold-ai.devpost.com/", name: "SNS Bold $12k" },
  { url: "https://rice-urban-sustainability.devpost.com/", name: "Rice $17k" },
  { url: "https://adtc-2026.devpost.com/", name: "Africa $16k" },
  { url: "https://backblaze-generative-media.devpost.com/", name: "Backblaze $10k" },
  { url: "https://igad-husika-hackathon.devpost.com/", name: "IGAD $10k" },
  { url: "https://celesta-exoplanet-challenge.devpost.com/", name: "Exoplanet $10k" },
  { url: "https://kaya-ai-iit-hackathon-2026.devpost.com/", name: "Kaya AI $350k" },
  { url: "https://xprize.devpost.com/", name: "Gemini XPRIZE $2M" },
];

async function joinHackathon(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(3000);

  // Join ボタンをJS直接クリック
  const joined = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("a,button")]
      .find(el => /join hackathon/i.test(el.textContent));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (joined) await page.waitForTimeout(2500);

  // Submit ボタン/リンクを探す
  const submitUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href]")];
    const sub = links.find(a =>
      /submissions\/new|submit.to.*manage/i.test(a.href) ||
      /submit project|enter.*submission|start.*submission/i.test(a.textContent)
    );
    return sub?.href || null;
  });

  return { joined, submitUrl };
}

async function fillAndSubmit(page, submitUrl) {
  await page.goto(submitUrl, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(3000);

  // New submission ボタンを探す
  const newSubUrl = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a[href]")]
      .find(el => /new|add|start|create/i.test(el.textContent) && /submission/i.test(el.href));
    if (a) { a.click(); return a.href; }
    const btn = [...document.querySelectorAll("button")]
      .find(el => /new|add|start/i.test(el.textContent));
    if (btn) { btn.click(); return "clicked"; }
    return null;
  });
  if (newSubUrl) await page.waitForTimeout(2500);

  // フォームをJSで直接入力
  const filled = await page.evaluate((github) => {
    const set = (sels, val) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) {
          const nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
          if (nativeInput) nativeInput.set.call(el, val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      }
      return false;
    };

    const titleOk = set(['input[name="submission[title]"]', '#submission_title'], "Bounty Hunter — AI Prize Intelligence");
    if (!titleOk) return false;
    set(['input[name="submission[tagline]"]', '#submission_tagline'], "Automated prize discovery across 5 platforms, ranked by Claude AI.");
    set(['textarea[name="submission[description]"]', '#submission_description'],
      `Bounty Hunter scans Devpost, HackerOne, Gitcoin, Kaggle, and HeroX simultaneously. Claude AI scores each opportunity 0-100 based on prize value, deadline urgency, and solo eligibility.\n\nBuilt with Next.js 16, TypeScript, Tailwind CSS v4, Claude Haiku.\n\nGitHub: ${github}`);
    set(['input[name="submission[url]"]', 'input[placeholder*="github" i]', 'input[placeholder*="url" i]'], github);
    return true;
  }, GITHUB);

  if (!filled) return false;

  // Saveボタン
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button,input[type='submit']")]
      .find(el => /save|next|submit/i.test(el.textContent || el.value));
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);
  return true;
}

async function main() {
  LOG("🏹 Devpost JS注入提出");
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  let ok = 0;
  for (const h of HACKATHONS) {
    LOG(`\n[${HACKATHONS.indexOf(h)+1}/${HACKATHONS.length}] ${h.name}`);
    try {
      const { joined, submitUrl } = await joinHackathon(page, h.url);
      if (joined) LOG("  ✓ Join");
      if (submitUrl) {
        const submitted = await fillAndSubmit(page, submitUrl);
        if (submitted) { LOG("  ✓ 提出"); ok++; }
        else LOG("  → フォーム未検出");
      } else {
        LOG("  → Submitリンク未検出");
      }
    } catch (e) {
      LOG(`  ✗ ${e.message?.slice(0,60)}`);
    }
    await page.waitForTimeout(500);
  }

  LOG(`\n✅ 完了: ${ok}/${HACKATHONS.length}件提出`);
}

main().catch(e => LOG(`FATAL: ${e.message}`));
