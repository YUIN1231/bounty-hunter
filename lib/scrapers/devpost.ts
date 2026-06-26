import { Opportunity } from "@/lib/types";

interface DevpostItem {
  id: string;
  title: string;
  url: string;
  prize_amount: string;
  submission_period_dates: string;
  themes: { name: string }[];
  open_state: string;
  eligibility_requirement_to_participate: string;
  registrations_count: number;
  prizes: { title: string; amount: string }[];
}

export async function scrapeDevpost(): Promise<Opportunity[]> {
  const url =
    "https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&order_by=prize-amount&per_page=20";

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "BountyHunter/1.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const items: DevpostItem[] = data.hackathons ?? [];

  return items.map((h) => {
    const prizeRaw = h.prize_amount ?? "";
    const prize = parsePrize(prizeRaw);
    const solo =
      h.eligibility_requirement_to_participate?.toLowerCase().includes("individual") ?? null;

    const participants = h.registrations_count ?? 0;
    const prizeSlots = Math.max(1, (h.prizes ?? []).length);
    const winRate = participants > 0
      ? Math.min(100, Math.round((prizeSlots / participants) * 100))
      : null;

    return {
      id: `devpost-${h.id}`,
      title: h.title,
      platform: "devpost",
      category: "hackathon",
      prize,
      prizeLabel: prizeRaw ? stripHtml(prizeRaw) : "不明",
      deadline: parseDeadline(h.submission_period_dates),
      url: h.url,
      solo,
      online: true,
      tags: (h.themes ?? []).map((t) => t.name),
      score: 0,
      winRate,
      participants,
      prizeSlots,
      fetchedAt: new Date().toISOString(),
    };
  });
}

function parsePrize(raw: string): number | null {
  const clean = raw.replace(/<[^>]+>/g, "").replace(/,/g, "");
  const m = clean.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, "").trim();
}

function parseDeadline(dates: string): string | null {
  if (!dates) return null;
  const parts = dates.split(" - ");
  const end = parts[parts.length - 1]?.trim();
  if (!end) return null;
  const d = new Date(end);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
