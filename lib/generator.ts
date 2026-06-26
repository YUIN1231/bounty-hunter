import Anthropic from "@anthropic-ai/sdk";
import { CompetitionIntelligence } from "./intelligence";

const client = new Anthropic();

export interface GeneratedSubmission {
  title: string;
  tagline: string;
  inspiration: string;
  whatItDoes: string;
  howWeBuiltIt: string;
  challenges: string;
  accomplishments: string;
  whatWeLearned: string;
  whatsNext: string;
  builtWith: string[];
  // 品質評価
  qualityScore: number;        // 0-100
  criteriaScores: { criterion: string; score: number; feedback: string }[];
  improvements: string[];      // 改善提案
  winProbabilityBoost: string; // この提出物で勝率がどう上がるか
}

const PROJECT_CONTEXT = `
## プロジェクト: Bounty Hunter

### 何をするシステムか
インターネット上のすべての賞金案件（ハッカソン・バグバウンティ・MLコンペ・グラント等）を
毎日自動スキャンし、AIでスコアリングして期待収益を最大化するプラットフォーム。

### 実際の機能（具体的な数字）
- 5プラットフォームを同時スキャン（Devpost・HackerOne・Gitcoin・Kaggle・HeroX）
- Claude AIで0-100のスコアリング（賞金・締切・勝率・スキルマッチを考慮）
- スキャン時間：5秒以内
- 毎日739件以上の案件をトラッキング中
- 勝率計算（参加者数÷賞金枠数）をリアルタイム表示
- カテゴリ・賞金額・締切でフィルタリング

### 技術スタック
- Next.js 16 (App Router)
- Claude Haiku API（スコアリング）
- Claude Sonnet API（提出物生成）
- TypeScript / Tailwind CSS v4
- 5つの独立したスクレイパー（並列実行）
- GitLab CI/CDパイプライン対応

### GitHub
https://github.com/YUIN1231/bounty-hunter

### 差別化ポイント
- 単なる集約ツールではなく「期待収益（EV）最大化」に特化
- 同様のツールが世界に存在しない
- 自分自身がこのシステムを使って賞金を稼ぐ（ドッグフーディング）
`;

export async function generateSubmission(
  competition: CompetitionIntelligence,
  competitionUrl: string
): Promise<GeneratedSubmission> {
  const criteriaText = competition.judgingCriteria
    .map((c) => `- ${c.name}（${c.weight}%）: ${c.description}`)
    .join("\n");

  const prompt = `あなたは世界最高レベルのハッカソン提出物ライターです。
以下のコンペティションに向けて、**絶対に入賞できる**提出物を作成してください。

## コンペティション情報
タイトル: ${competition.title}
URL: ${competitionUrl}
テーマ: ${competition.theme}
審査員: ${competition.audience}
審査基準:
${criteriaText}
審査員が見たいもの: ${competition.whatJudgesWant}
勝つための角度: ${competition.winningAngle}
重要キーワード: ${competition.keywords.join(", ")}

## 提出するプロジェクト
${PROJECT_CONTEXT}

## 指示
1. 審査基準の最重要項目から逆算してナラティブを設計する
2. コンペのキーワードを自然に組み込む
3. 具体的な数字を必ず含める（「約」は使わない）
4. 「このプロジェクトはなぜこのコンペに最適か」を明確にする
5. 審査員を驚かせる独自の切り口を1つ入れる
6. 英語で書く（国際コンペ向け）

以下のJSON形式で返してください:
{
  "title": "コンペ特化タイトル",
  "tagline": "インパクトのある1行（最大15語）",
  "inspiration": "なぜ作ったか（コンペテーマと接続）",
  "whatItDoes": "何をするか（箇条書き3-5点、具体的な数字入り）",
  "howWeBuiltIt": "どう作ったか（技術的な深みを見せる）",
  "challenges": "難しかった部分（誠実に、解決策も）",
  "accomplishments": "誇れる成果（数字で証明）",
  "whatWeLearned": "学んだこと",
  "whatsNext": "次のステップ（審査員が共感するビジョン）",
  "builtWith": ["技術1", "技術2"],
  "qualityScore": 審査員目線での品質スコア0-100,
  "criteriaScores": [
    {"criterion": "基準名", "score": 0-100, "feedback": "この基準での強み"}
  ],
  "improvements": ["改善提案1", "改善提案2", "改善提案3"],
  "winProbabilityBoost": "この提出物がなぜ入賞できるかの根拠"
}

JSONのみ返してください。`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Generation failed");

  return JSON.parse(jsonMatch[0]) as GeneratedSubmission;
}

export async function improveSubmission(
  submission: GeneratedSubmission,
  competition: CompetitionIntelligence,
  focusArea: string
): Promise<GeneratedSubmission> {
  const prompt = `以下の提出物を改善してください。
改善フォーカス: ${focusArea}
審査員が見たいもの: ${competition.whatJudgesWant}

現在の提出物:
${JSON.stringify(submission, null, 2)}

改善した版を同じJSON形式で返してください。
qualityScoreは必ず現在より高くすること。`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return submission;

  return JSON.parse(jsonMatch[0]) as GeneratedSubmission;
}
