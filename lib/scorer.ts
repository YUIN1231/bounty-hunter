import Anthropic from "@anthropic-ai/sdk";
import { Opportunity } from "@/lib/types";

const client = new Anthropic();

export async function scoreOpportunities(items: Opportunity[]): Promise<Opportunity[]> {
  if (items.length === 0) return [];

  const prompt = `以下の賞金獲得機会リストを評価してください。
各項目に0〜100のスコアをつけてください。
評価基準:
- 賞金額が高い（最重要）
- 締切まで余裕がある
- オンライン・個人参加OK
- AI/開発スキルで戦える

JSONのみ返してください。形式: [{"id": "...", "score": 数値}, ...]

リスト:
${JSON.stringify(
  items.map((i) => ({
    id: i.id,
    title: i.title,
    prize: i.prizeLabel,
    deadline: i.deadline,
    solo: i.solo,
    category: i.category,
    tags: i.tags,
  })),
  null,
  2
)}`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return items;

    const scores: { id: string; score: number }[] = JSON.parse(jsonMatch[0]);
    const scoreMap = new Map(scores.map((s) => [s.id, s.score]));

    return items.map((item) => ({
      ...item,
      score: scoreMap.get(item.id) ?? 50,
    }));
  } catch {
    return items;
  }
}
