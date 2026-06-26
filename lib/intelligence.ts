import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface JudgingCriterion {
  name: string;
  weight: number; // 0-100
  description: string;
}

export interface CompetitionIntelligence {
  title: string;
  theme: string;         // コアテーマ
  audience: string;      // 審査員像
  judgingCriteria: JudgingCriterion[];
  requirements: string[];
  prizes: { place: string; amount: string }[];
  keywords: string[];    // 審査員が使う言葉
  winningAngle: string;  // このコンペで勝つための切り口
  whatJudgesWant: string; // 審査員が本当に見たいもの
}

export async function analyzeCompetition(
  url: string,
  rawDescription: string
): Promise<CompetitionIntelligence> {
  const prompt = `あなたは世界トップレベルのハッカソン審査員です。
以下のコンペティション情報を分析して、どうすれば入賞できるかを教えてください。

URL: ${url}
説明文:
${rawDescription.slice(0, 3000)}

以下のJSON形式で回答してください（日本語可）:
{
  "title": "コンペ名",
  "theme": "コアテーマ（1文）",
  "audience": "審査員像（誰が審査するか）",
  "judgingCriteria": [
    {"name": "基準名", "weight": 40, "description": "詳細説明"},
    ...
  ],
  "requirements": ["要件1", "要件2"],
  "prizes": [{"place": "1位", "amount": "$X"}],
  "keywords": ["このコンペで使うべきキーワード"],
  "winningAngle": "このプロジェクトをどう見せれば入賞できるか（具体的な戦略）",
  "whatJudgesWant": "審査員が本当に見たいもの（1-2文）"
}

JSONのみ返してください。`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    return JSON.parse(jsonMatch[0]) as CompetitionIntelligence;
  } catch {
    // フォールバック
    return {
      title: "Unknown Competition",
      theme: "Innovation and Technology",
      audience: "Technical judges with industry experience",
      judgingCriteria: [
        { name: "Innovation", weight: 30, description: "How novel is the solution?" },
        { name: "Technical Execution", weight: 30, description: "Is it well built?" },
        { name: "Impact", weight: 25, description: "What problem does it solve?" },
        { name: "Presentation", weight: 15, description: "Is it clearly communicated?" },
      ],
      requirements: ["Working demo", "GitHub repository"],
      prizes: [],
      keywords: ["AI", "automation", "efficiency"],
      winningAngle: "Focus on concrete impact and working demo",
      whatJudgesWant: "A working solution that solves a real problem with measurable results",
    };
  }
}
