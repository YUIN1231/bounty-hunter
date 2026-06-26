/**
 * 賞金ポートフォリオ管理
 * node scripts/portfolio.mjs              # 現状表示
 * node scripts/portfolio.mjs won <id>     # 受賞記録
 * node scripts/portfolio.mjs lost <id>    # 落選記録
 * node scripts/portfolio.mjs add          # 新規追加
 */
import fs from "fs";
import path from "path";
import readline from "readline";

const DATA = path.join(process.cwd(), "data", "portfolio.json");
const STATUS_LIVE = ["submitted", "building"];
const STATUS_ICON = { submitted:"📤", building:"🔨", won:"🏆", lost:"❌", expired:"⏱" };

function load() { return JSON.parse(fs.readFileSync(DATA, "utf-8")); }
function save(d) { fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); }

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

function personalWinRate(submissions) {
  const decided = submissions.filter(s => s.status === "won" || s.status === "lost");
  if (decided.length === 0) return null;
  const wins = submissions.filter(s => s.status === "won").length;
  return Math.round((wins / decided.length) * 100);
}

// 参加者数から勝率を判定
function winRateClass(wr) {
  if (wr === null) return "❓";
  if (wr >= 20) return "🟢";
  if (wr >= 5)  return "🟡";
  return "🔴";
}

function display() {
  const data = load();
  const today = new Date().toISOString().slice(0, 10);

  // 期限切れ自動更新
  let changed = false;
  data.submissions.forEach(s => {
    if (STATUS_LIVE.includes(s.status) && s.deadline && s.deadline < today) {
      s.status = "expired"; changed = true;
    }
  });
  if (changed) save(data);

  const live    = data.submissions.filter(s => STATUS_LIVE.includes(s.status));
  const won     = data.submissions.filter(s => s.status === "won");
  const expired = data.submissions.filter(s => s.status === "expired");
  const total   = data.submissions.length;

  const livePotential = live.reduce((s, x) => s + (x.prize_usd || 0), 0);
  const totalWon      = won.reduce((s, x) => s + (x.actual_usd || 0), 0);
  const winRate       = personalWinRate(data.submissions);
  const goalMet       = livePotential >= data.goal.min_live_potential_usd;
  const winRateOk     = winRate === null || winRate >= data.goal.target_win_rate_pct;

  console.log("\n🏹 BOUNTY HUNTER PORTFOLIO");
  console.log("═══════════════════════════════════════════════════");

  // ゴール
  console.log(`${goalMet ? "✅" : "⚠️ "} LIVE POTENTIAL : $${livePotential.toLocaleString().padStart(9)} (目標 $${data.goal.min_live_potential_usd.toLocaleString()}+)`);
  console.log(`🏆 TOTAL EARNED  : $${totalWon.toLocaleString().padStart(9)}`);

  // 個人勝率
  const wrDisplay = winRate === null ? "未確定" : `${winRate}%`;
  const wrTarget  = `${data.goal.target_win_rate_pct}%`;
  console.log(`${winRateOk ? "✅" : "⚠️ "} 個人勝率       : ${wrDisplay.padStart(4)} (目標 ${wrTarget}+)`);
  console.log(`📊 応募数        : ${live.length}件応募中 / 通算${total}件 (受賞${won.length} 期限切${expired.length})`);
  console.log("───────────────────────────────────────────────────");

  // 応募中リスト（締切順）
  const sorted = [...live].sort((a, b) => (a.deadline||"9").localeCompare(b.deadline||"9"));

  console.log("\n📤 応募中（締切順）");
  console.log("  [勝率]  [賞金]      [締切]           [名前]");
  sorted.forEach(s => {
    const days = daysLeft(s.deadline);
    const urgency = days === null ? "      " : days <= 0 ? "🔴今日" : days <= 7 ? `🟡${days}日  ` : `⚪${days}日  `;
    const wr    = s.win_rate_pct != null ? `${s.win_rate_pct}%`.padStart(4) : " ❓ ";
    const icon  = winRateClass(s.win_rate_pct);
    const prize = `$${(s.prize_usd||0).toLocaleString()}`.padStart(10);
    console.log(`  ${icon}${wr} ${prize} | ${s.deadline||"????-??-??"} ${urgency}| ${s.name}`);
  });

  // 受賞
  if (won.length > 0) {
    console.log("\n🏆 受賞済み");
    won.forEach(s => console.log(`  💰 $${(s.actual_usd||0).toLocaleString()} ← $${(s.prize_usd||0).toLocaleString()} pool | ${s.name}`));
  }

  // アラート
  console.log("\n───────────────────────────────────────────────────");
  if (!goalMet) {
    const gap = data.goal.min_live_potential_usd - livePotential;
    console.log(`⚠️  LIVE POTENTIAL が目標を $${gap.toLocaleString()} 下回っています → 新規応募が必要`);
  }
  const redFlags = live.filter(s => s.win_rate_pct != null && s.win_rate_pct < 2);
  if (redFlags.length > 0) {
    console.log(`⚠️  勝率2%未満の応募が${redFlags.length}件あります:`);
    redFlags.forEach(s => console.log(`   🔴 ${s.name} (${s.win_rate_pct}%)`));
  }
  if (goalMet && winRateOk) {
    console.log("✅ ゴール達成中");
  }
  console.log("");
}

async function addSubmission() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));
  console.log("\n新規応募を追加");
  const name     = await ask("ハッカソン名: ");
  const url      = await ask("URL: ");
  const prize    = parseInt(await ask("賞金($): ") || "0");
  const deadline = await ask("締切 (YYYY-MM-DD): ");
  const parts    = parseInt(await ask("参加者数（不明なら0）: ") || "0");
  const slots    = parseInt(await ask("賞金枠数（不明なら1）: ") || "1");
  const project  = await ask("プロジェクト名: ");
  const status   = (await ask("ステータス (submitted/building): ") || "submitted").trim();
  rl.close();

  const winRate = parts > 0 ? Math.min(100, Math.round((slots / parts) * 100)) : null;
  const data = load();
  data.submissions.push({
    id: `${name.toLowerCase().replace(/\s+/g,"-").slice(0,20)}-${Date.now()}`,
    name, url, prize_usd: prize, deadline, status, project,
    win_rate_pct: winRate, participants: parts, prize_slots: slots,
    submitted_at: new Date().toISOString().slice(0, 10), notes: "",
  });
  save(data);
  console.log(`✓ 追加 (勝率: ${winRate !== null ? winRate + "%" : "不明"})`);
}

function markResult(id, result, amount) {
  const data = load();
  const sub = data.submissions.find(s =>
    s.id === id || s.name.toLowerCase().includes(id.toLowerCase())
  );
  if (!sub) { console.log("見つかりません:", id); return; }
  sub.status = result;
  if (result === "won") sub.actual_usd = parseInt(amount || sub.prize_usd);
  save(data);
  const wr = personalWinRate(data.submissions);
  console.log(`${result === "won" ? "🏆" : "❌"} 記録: ${sub.name}`);
  console.log(`   個人勝率: ${wr !== null ? wr + "%" : "未確定"}`);
}

const [,, cmd, ...args] = process.argv;
if (cmd === "won")  markResult(args[0], "won", args[1]);
else if (cmd === "lost")  markResult(args[0], "lost");
else if (cmd === "add")   addSubmission();
else display();
