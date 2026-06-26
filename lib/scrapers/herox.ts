import { Opportunity } from "@/lib/types";

interface HeroXChallenge {
  id: number;
  title: string;
  url: string;
  prize_value: number;
  prize_currency: string;
  registration_end: string;
  tags: string[];
}

export async function scrapeHeroX(): Promise<Opportunity[]> {
  const url = "https://www.herox.com/api/v2/challenges/?status=active&ordering=-prize_value&page_size=20";

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "BountyHunter/1.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const items: HeroXChallenge[] = data.results ?? [];

  return items.map((c) => ({
    id: `herox-${c.id}`,
    title: c.title,
    platform: "herox",
    category: "innovation",
    prize: c.prize_value ?? null,
    prizeLabel: c.prize_value
      ? `$${c.prize_value.toLocaleString()}`
      : "不明",
    deadline: c.registration_end ?? null,
    url: c.url || `https://www.herox.com/challenges`,
    solo: null,
    online: true,
    tags: c.tags ?? [],
    score: 0,
    winRate: null,
    participants: 0,
    prizeSlots: 1,
    fetchedAt: new Date().toISOString(),
  }));
}
