# 🏹 Bounty Hunter — 賞金稼ぎシステム全体まとめ

## システム概要

「応募してお金が入る」の流れを全自動化した賞金狩りシステム。
ジャンル問わず、ネット上の全賞金案件に継続的に応募し続ける。

---

## 登録済みプラットフォーム

### ハッカソン系（完成品を作って提出）
| プラットフォーム | URL | 特徴 | 単価目安 |
|---|---|---|---|
| **Devpost** | devpost.com | 最大のハッカソン集約地。毎週新着 | $100〜$2M |
| **DoraHacks** | dorahacks.io | Web3・AI・量子。グローバル | $1,000〜$220k |
| **Devfolio** | devfolio.co | インド発、グローバル参加可 | $500〜$10k |
| **Lablab.ai** | lablab.ai | AI専門ハッカソン | $5k〜$50k |

### バウンティ系（タスク完成で即払い）
| プラットフォーム | URL | 特徴 | 単価目安 |
|---|---|---|---|
| **Superteam Earn** | earn.superteam.fun | Solanaエコ。開発・デザイン・ライティング | $100〜$5k |
| **Replit Bounties** | replit.com/bounties | 小さいタスク。完成で即払い | $50〜$2k |
| **Topcoder** | topcoder.com | 企業直依頼の開発コンペ | $300〜$5k |
| **Gitcoin** | gitcoin.co | Web3オープンソース開発 | $100〜$10k |

### バグバウンティ系（バグ発見で即払い）
| プラットフォーム | URL | 特徴 | 単価目安 |
|---|---|---|---|
| **HackerOne** | hackerone.com | 最大のバグバウンティ集約地 | $100〜$100k |
| **Bugcrowd** | bugcrowd.com | HackerOneに次ぐ規模 | $100〜$50k |
| **Immunefi** | immunefi.com | Web3特化。単価が桁違い | $1k〜$10M |
| **Intigriti** | intigriti.com | ヨーロッパ系企業が多い | $100〜$50k |

### MLコンペ系（モデル精度を競う）
| プラットフォーム | URL | 特徴 | 単価目安 |
|---|---|---|---|
| **Kaggle** | kaggle.com | 最大のMLコンペ。毎週開催 | $1k〜$1M |
| **AIcrowd** | aicrowd.com | AI・強化学習特化 | $500〜$50k |
| **DrivenData** | drivendata.org | 社会課題×AI | $5k〜$100k |
| **Numerai** | numer.ai | 週次提出でトークン報酬 | 毎週$50〜$500 |

---

## 毎日の流れ

```
毎日 7:00 JST（自動）
  ↓
Daily Bounty Blitz agent 起動
  ↓
全プラットフォームをスキャン（新着案件を検出）
  ↓
daily-REPORT.md に新着一覧を出力
DAILY_LOG.md に1行追記
  ↓
あなたがレポートを見て
「これに応募して」と指示
  ↓
自動で提出スクリプト実行
```

毎週月曜 8:00 JST（自動）にも追加スキャン実施。

---

## コマンド一覧

```bash
# 現在の状態を見る
node scripts/portfolio.mjs

# 新着をスキャンして全部に登録
node scripts/blitz-all.mjs

# 特定プラットフォームに提出
node scripts/submit-wave2.mjs

# 受賞を記録
node scripts/portfolio.mjs won "ハッカソン名" 1000

# 落選を記録
node scripts/portfolio.mjs lost "ハッカソン名"

# 新規手動追加
node scripts/portfolio.mjs add
```

---

## お金が入るまでの流れ（種類別）

### ハッカソン（1〜2ヶ月）
```
提出済み → 審査 → 受賞メール → フォーム記入 → 振込
```

### バウンティタスク（数日）
```
申請 → 採用 → 作業 → 提出 → 承認 → USDC即払い
```

### バグバウンティ（2〜8週間）
```
バグ発見 → レポート提出 → 確認 → 有効判定 → 振込
```

### MLコンペ（数ヶ月）
```
モデル提出 → 締切まで改善 → 審査 → 受賞 → 振込
```

---

## 現在の数字

- **GitHub**: https://github.com/YUIN1231/bounty-hunter
- **応募中**: 随時更新（`node scripts/portfolio.mjs` で確認）
- **毎日自動スキャン**: https://claude.ai/code/routines/trig_01868JptPckqSkAj198avn62
- **週次スキャン**: https://claude.ai/code/routines/trig_01VfnDXXHnWcBmQm4BkmSs1r

---

## 賞金受け取り準備

USDC（仮想通貨）での受け取りが多いため：
1. **Phantomウォレット** 作成（無料）
2. 国内取引所（Coincheck等）でUSDC→円に換金

PayPal / 銀行振込の案件はそのまま受け取り可能。

---

## 目標

- 常に **LIVE POTENTIAL $1,000以上** をキープ
- 応募数を増やして **1本でも当たる確率を最大化**
- バウンティタスクを1本完成させて **最速で初入金を体験**

---

*最終更新: 2026-06-25*
