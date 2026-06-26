export type Platform =
  | "devpost"
  | "hackerone"
  | "gitcoin"
  | "kaggle"
  | "herox"
  | "immunefi";

export type Category =
  | "hackathon"
  | "bug-bounty"
  | "dev-bounty"
  | "ml-competition"
  | "innovation";

export interface Opportunity {
  id: string;
  title: string;
  platform: Platform;
  category: Category;
  prize: number | null;      // USD
  prizeLabel: string;
  deadline: string | null;   // ISO date
  url: string;
  solo: boolean | null;
  online: boolean;
  tags: string[];
  score: number;             // 0-100, Claude が算出
  winRate: number | null;    // % = prizeSlots / participants * 100
  participants: number;
  prizeSlots: number;
  fetchedAt: string;
}
