import { Opportunity } from "@/lib/types";
import { scrapeDevpost } from "@/lib/scrapers/devpost";
import { scrapeHackerOne } from "@/lib/scrapers/hackerone";
import { scrapeGitcoin } from "@/lib/scrapers/gitcoin";
import { scrapeKaggle } from "@/lib/scrapers/kaggle";
import { scrapeHeroX } from "@/lib/scrapers/herox";
import { scoreOpportunities } from "@/lib/scorer";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "opportunities.json");

export async function runScan(): Promise<Opportunity[]> {
  const results = await Promise.allSettled([
    scrapeDevpost(),
    scrapeHackerOne(),
    scrapeGitcoin(),
    scrapeKaggle(),
    scrapeHeroX(),
  ]);

  const all: Opportunity[] = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<Opportunity[]>).value);

  const scored = await scoreOpportunities(all);
  const sorted = scored.sort((a, b) => b.score - a.score);

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(sorted, null, 2));

  return sorted;
}

export function loadOpportunities(): Opportunity[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}
