import { Opportunity } from "@/lib/types";

interface H1Program {
  id: string;
  attributes: {
    name: string;
    url: string;
    maximum_bounty: number;
    minimum_bounty: number;
    submission_state: string;
  };
}

export async function scrapeHackerOne(): Promise<Opportunity[]> {
  const url = "https://hackerone.com/programs/search?query=type%3Ahackerone&sort=maximum_bounty%3Adesc&limit=20";

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "BountyHunter/1.0",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const items: H1Program[] = data.results ?? [];

  return items
    .filter((p) => p.attributes.submission_state === "open")
    .map((p) => ({
      id: `hackerone-${p.id}`,
      title: p.attributes.name,
      platform: "hackerone",
      category: "bug-bounty",
      prize: p.attributes.maximum_bounty ?? null,
      prizeLabel: p.attributes.maximum_bounty
        ? `$${p.attributes.maximum_bounty.toLocaleString()} max`
        : "不明",
      deadline: null,
      url: `https://hackerone.com${p.attributes.url}`,
      solo: true,
      online: true,
      tags: ["security", "bug-bounty"],
      score: 0,
      fetchedAt: new Date().toISOString(),
    }));
}
