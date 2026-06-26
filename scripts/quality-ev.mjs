/**
 * クオリティ込み期待値計算
 * node scripts/quality-ev.mjs
 */
import fs from "fs";
import path from "path";

const PORTFOLIO = path.join(process.cwd(), "data", "portfolio.json");
const data = JSON.parse(fs.readFileSync(PORTFOLIO, "utf-8"));
const today = new Date().toISOString().slice(0, 10);

// クオリティスコア計算
function qualityScore(s) {
  let score = 0;
  if (s.has_content) score += 40;          // 中身がある
  else if (s.status === "submitted") score += 10; // 提出だけ
  if (s.participants > 0) score += 10;      // 参加者数把握済み
  if (s.prize_usd > 0) score += 10;        // 賞金あり
  if (s.deadline) score += 10;             // 締切明確
  if (s.win_rate_pct !== null) score += 10; // 勝率計算済み
  if (s.notes && s.notes.length > 3) score += 10; // カテゴリ把握
  return Math.min(100, score);
}

// ベース勝率（カテゴリ別）
const BASE_RATES = {
  "bug-bounty": 0.005, "web3-bug-bounty": 0.008,
  "kaggle": 0.025, "zindi-ml": 0.10, "aicrowd": 0.06,
  "drivendata": 0.06, "evalai": 0.12, "ctf": 0.10,
  "game-jam": 0.15, "competitive-prog": 0.04,
  "dorahacks": 0.05, "devfolio": 0.12,
  "superteam": 0.40, "replit": 0.60, "herox": 0.06,
  "devpost": 0.008,
};

const live = data.submissions.filter(s => {
  if (!["submitted", "building"].includes(s.status)) return false;
  if (s.deadline && s.deadline < today) return false;
  return true;
});

let totalEV = 0, totalPot = 0, qualityTotal = 0;
const byCategory = {};

for (const s of live) {
  const note = s.notes?.split(",")[0] || "other";
  const baseRate = BASE_RATES[note] || 0.006;

  // クオリティ倍率（0.2x〜2.0x）
  const q = qualityScore(s);
  const qualityMult = 0.2 + (q / 100) * 1.8;

  // 参加者数による調整
  const partMult = s.participants > 0 ? Math.min(2, 50 / s.participants) : 1;

  const finalRate = Math.min(0.5, baseRate * qualityMult * partMult);
  const ev = (s.prize_usd || 0) * finalRate;

  totalEV += ev;
  totalPot += s.prize_usd || 0;
  qualityTotal += q;

  if (!byCategory[note]) byCategory[note] = { count: 0, pot: 0, ev: 0 };
  byCategory[note].count++;
  byCategory[note].pot += s.prize_usd || 0;
  byCategory[note].ev += ev;
}

const avgQuality = Math.round(qualityTotal / live.length);

// 実際に中身がある提出
const withContent = live.filter(s => s.has_content).length;
const submitted = live.filter(s => s.status === "submitted").length;

console.log("\n🏹 クオリティ込み獲得賞金予測");
console.log("═══════════════════════════════════════");
console.log(`応募中:         ${live.length}件`);
console.log(`  うち中身あり:  ${withContent}件`);
console.log(`  うち提出済み:  ${submitted}件`);
console.log(`平均クオリティ: ${avgQuality}/100`);
console.log("");
console.log(`理論合計:       $${totalPot.toLocaleString()}`);
console.log(`期待値（EV）:   $${Math.round(totalEV).toLocaleString()}`);
console.log("");

// $100k フロア確認
const highQualityEV = live
  .filter(s => s.has_content)
  .reduce((sum, s) => {
    const note = s.notes?.split(",")[0] || "other";
    const baseRate = BASE_RATES[note] || 0.006;
    const q = qualityScore(s);
    const qualityMult = 0.2 + (q / 100) * 1.8;
    const partMult = s.participants > 0 ? Math.min(2, 50 / s.participants) : 1;
    return sum + (s.prize_usd || 0) * Math.min(0.5, baseRate * qualityMult * partMult);
  }, 0);

console.log(`高品質提出のEV: $${Math.round(highQualityEV).toLocaleString()}`);
console.log(`$100k フロア:   ${totalPot >= 100000 ? "✅ 達成中" : "❌ 不足"}`);
console.log("");
console.log("カテゴリ別 EV TOP10:");
Object.entries(byCategory)
  .sort((a, b) => b[1].ev - a[1].ev)
  .slice(0, 10)
  .forEach(([k, v]) => {
    console.log(`  ${k.padEnd(22)} ${v.count.toString().padStart(4)}件  EV: $${Math.round(v.ev).toLocaleString().padStart(8)}`);
  });

console.log("\n毎日$100k以上キープするには:");
const highValueLive = live.filter(s => (s.prize_usd || 0) >= 1000).length;
console.log(`  $1k以上の案件: ${highValueLive}件 (十分)`);
console.log("  期限切れ案件を新規案件で毎日補充 → Daily 500が担当");
