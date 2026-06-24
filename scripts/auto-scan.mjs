// 毎日自動スキャン。cron で実行: node scripts/auto-scan.mjs
const BASE = process.env.BASE_URL || "http://localhost:3005";

async function scan() {
  console.log(`[${new Date().toISOString()}] スキャン開始...`);
  const res = await fetch(`${BASE}/api/scan`, { method: "POST" });
  const data = await res.json();
  if (data.ok) {
    console.log(`✓ ${data.count} 件取得`);
    const top3 = data.opportunities.slice(0, 3);
    top3.forEach((o, i) => {
      console.log(`  ${i + 1}. [${o.prizeLabel}] ${o.title}`);
    });
  } else {
    console.error("✗ エラー:", data.error);
  }
}

scan();
