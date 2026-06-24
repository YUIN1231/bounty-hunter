import { Opportunity } from "@/lib/types";

interface KaggleComp {
  ref: string;
  title: string;
  url: string;
  reward: string;
  deadline: string;
  tags: string[];
}

export async function scrapeKaggle(): Promise<Opportunity[]> {
  // Kaggle公開API（認証不要の公開リスト）
  const url = "https://www.kaggle.com/api/v1/competitions/list?sortBy=prize&pageSize=20";

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "BountyHunter/1.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const items: KaggleComp[] = await res.json();

  return items.map((c) => {
    const prize = parsePrize(c.reward);
    return {
      id: `kaggle-${c.ref}`,
      title: c.title,
      platform: "kaggle",
      category: "ml-competition",
      prize,
      prizeLabel: c.reward || "不明",
      deadline: c.deadline ?? null,
      url: `https://www.kaggle.com/competitions/${c.ref}`,
      solo: true,
      online: true,
      tags: c.tags ?? [],
      score: 0,
      fetchedAt: new Date().toISOString(),
    };
  });
}

function parsePrize(raw: string): number | null {
  if (!raw) return null;
  const m = raw.replace(/,/g, "").match(/\d+/);
  return m ? parseInt(m[0]) : null;
}
