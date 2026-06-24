"use client";

import { useState, useEffect, useCallback } from "react";
import { Opportunity, Platform, Category } from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  devpost: "Devpost",
  hackerone: "HackerOne",
  gitcoin: "Gitcoin",
  kaggle: "Kaggle",
  herox: "HeroX",
  immunefi: "Immunefi",
};

const CATEGORY_LABELS: Record<Category, string> = {
  hackathon: "ハッカソン",
  "bug-bounty": "バグバウンティ",
  "dev-bounty": "開発バウンティ",
  "ml-competition": "MLコンペ",
  innovation: "イノベーション",
};

const CATEGORY_COLORS: Record<Category, string> = {
  hackathon: "bg-blue-900 text-blue-200",
  "bug-bounty": "bg-red-900 text-red-200",
  "dev-bounty": "bg-green-900 text-green-200",
  "ml-competition": "bg-purple-900 text-purple-200",
  innovation: "bg-amber-900 text-amber-200",
};

function daysLeft(deadline: string | null): string {
  if (!deadline) return "—";
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "終了";
  if (diff === 0) return "今日";
  return `${diff}日`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-zinc-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-zinc-400">{score}</span>
    </div>
  );
}

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [minPrize, setMinPrize] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/opportunities");
    const data = await res.json();
    setOpportunities(data.opportunities ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function scan() {
    setScanning(true);
    const res = await fetch("/api/scan", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      setOpportunities(data.opportunities);
      setLastScan(new Date().toLocaleTimeString("ja-JP"));
    }
    setScanning(false);
  }

  const filtered = opportunities.filter((o) => {
    if (filter !== "all" && o.category !== filter) return false;
    if (minPrize > 0 && (o.prize ?? 0) < minPrize) return false;
    return true;
  });

  const totalPrize = filtered.reduce((sum, o) => sum + (o.prize ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bounty Hunter</h1>
          <p className="text-zinc-500 text-sm mt-1">
            全プラットフォームの賞金機会を一括スキャン
          </p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="px-4 py-2 bg-white text-black text-sm font-bold rounded hover:bg-zinc-200 disabled:opacity-40 transition-colors"
        >
          {scanning ? "スキャン中..." : "今すぐスキャン"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-zinc-800 rounded p-4">
          <div className="text-3xl font-bold">{filtered.length}</div>
          <div className="text-zinc-500 text-xs mt-1">件の機会</div>
        </div>
        <div className="border border-zinc-800 rounded p-4">
          <div className="text-3xl font-bold">
            ${totalPrize > 0 ? (totalPrize / 1000).toFixed(0) + "k" : "—"}
          </div>
          <div className="text-zinc-500 text-xs mt-1">総賞金額</div>
        </div>
        <div className="border border-zinc-800 rounded p-4">
          <div className="text-3xl font-bold">
            {lastScan ?? "未スキャン"}
          </div>
          <div className="text-zinc-500 text-xs mt-1">最終スキャン</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(["all", "hackathon", "bug-bounty", "dev-bounty", "ml-competition", "innovation"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === c
                ? "border-white text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {c === "all" ? "すべて" : CATEGORY_LABELS[c]}
          </button>
        ))}
        <select
          value={minPrize}
          onChange={(e) => setMinPrize(Number(e.target.value))}
          className="ml-auto px-3 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-300"
        >
          <option value={0}>賞金：指定なし</option>
          <option value={1000}>$1,000+</option>
          <option value={5000}>$5,000+</option>
          <option value={10000}>$10,000+</option>
          <option value={50000}>$50,000+</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          {opportunities.length === 0
            ? "「今すぐスキャン」でデータを取得してください"
            : "条件に合う機会がありません"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <a
              key={o.id}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-zinc-800 rounded p-4 hover:border-zinc-600 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[o.category]}`}>
                      {CATEGORY_LABELS[o.category]}
                    </span>
                    <span className="text-xs text-zinc-500">{PLATFORM_LABELS[o.platform]}</span>
                    {o.solo && (
                      <span className="text-xs text-zinc-500">• ソロOK</span>
                    )}
                  </div>
                  <div className="text-sm font-medium group-hover:text-white transition-colors truncate">
                    {o.title}
                  </div>
                  <div className="mt-2">
                    <ScoreBar score={o.score} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-emerald-400">{o.prizeLabel}</div>
                  <div className={`text-xs mt-1 ${
                    daysLeft(o.deadline) === "終了" ? "text-red-400" :
                    parseInt(daysLeft(o.deadline)) <= 7 ? "text-yellow-400" :
                    "text-zinc-500"
                  }`}>
                    締切：{daysLeft(o.deadline)}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
