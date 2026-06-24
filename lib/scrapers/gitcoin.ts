import { Opportunity } from "@/lib/types";

interface GitcoinBounty {
  pk: number;
  title: string;
  url: string;
  value_in_usdt: number;
  expires_date: string;
  keywords: string;
  bounty_type: string;
}

export async function scrapeGitcoin(): Promise<Opportunity[]> {
  const url =
    "https://gitcoin.co/api/v0.1/bounties/?is_open=true&order_by=-_val_usd_db&limit=20";

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "BountyHunter/1.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const items: GitcoinBounty[] = await res.json();

  return items.map((b) => ({
    id: `gitcoin-${b.pk}`,
    title: b.title,
    platform: "gitcoin",
    category: "dev-bounty",
    prize: b.value_in_usdt ? Math.round(b.value_in_usdt) : null,
    prizeLabel: b.value_in_usdt
      ? `$${Math.round(b.value_in_usdt).toLocaleString()}`
      : "不明",
    deadline: b.expires_date ?? null,
    url: b.url,
    solo: true,
    online: true,
    tags: (b.keywords ?? "").split(",").map((k: string) => k.trim()).filter(Boolean),
    score: 0,
    fetchedAt: new Date().toISOString(),
  }));
}
