"use client";

import { useState, useEffect, useCallback } from "react";
import { Opportunity, Platform, Category } from "@/lib/types";
import type { GeneratedSubmission } from "@/lib/generator";
import type { CompetitionIntelligence } from "@/lib/intelligence";

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

function QualityBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-white">{score}/100</span>
    </div>
  );
}

interface SubmissionPanel {
  opportunity: Opportunity;
  intelligence: CompetitionIntelligence | null;
  submission: GeneratedSubmission | null;
  generating: boolean;
  error: string | null;
}

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [minPrize, setMinPrize] = useState(0);
  const [panel, setPanel] = useState<SubmissionPanel | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [improving, setImproving] = useState(false);

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

  async function generateSubmission(opp: Opportunity) {
    setPanel({ opportunity: opp, intelligence: null, submission: null, generating: true, error: null });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: opp.url, description: opp.title }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPanel({ opportunity: opp, intelligence: data.intelligence, submission: data.submission, generating: false, error: null });
    } catch (e) {
      setPanel(prev => prev ? { ...prev, generating: false, error: String(e) } : null);
    }
  }

  async function improveSubmission(focusArea: string) {
    if (!panel?.submission) return;
    setImproving(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: panel.opportunity.url,
          description: panel.opportunity.title,
          improve: true,
          currentSubmission: panel.submission,
          focusArea,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setPanel(prev => prev ? { ...prev, submission: data.submission } : null);
      }
    } finally {
      setImproving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const filtered = opportunities.filter((o) => {
    if (filter !== "all" && o.category !== filter) return false;
    if (minPrize > 0 && (o.prize ?? 0) < minPrize) return false;
    return true;
  });

  const totalPrize = filtered.reduce((sum, o) => sum + (o.prize ?? 0), 0);

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Left: Main Dashboard */}
      <div className={`flex flex-col ${panel ? "w-1/2" : "w-full"} transition-all duration-300`}>
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Bounty Hunter</h1>
              <p className="text-zinc-500 text-xs mt-0.5">AI賞金最大化システム</p>
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
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border border-zinc-800 rounded p-3">
              <div className="text-2xl font-bold">{filtered.length}</div>
              <div className="text-zinc-500 text-xs mt-0.5">件の機会</div>
            </div>
            <div className="border border-zinc-800 rounded p-3">
              <div className="text-2xl font-bold text-emerald-400">
                ${totalPrize > 0 ? (totalPrize / 1000).toFixed(0) + "k" : "—"}
              </div>
              <div className="text-zinc-500 text-xs mt-0.5">総賞金額</div>
            </div>
            <div className="border border-zinc-800 rounded p-3">
              <div className="text-lg font-bold">{lastScan ?? "未スキャン"}</div>
              <div className="text-zinc-500 text-xs mt-0.5">最終スキャン</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["all", "hackathon", "bug-bounty", "dev-bounty", "ml-competition", "innovation"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  filter === c ? "border-white text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {c === "all" ? "すべて" : CATEGORY_LABELS[c]}
              </button>
            ))}
            <select
              value={minPrize}
              onChange={(e) => setMinPrize(Number(e.target.value))}
              className="ml-auto px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-300"
            >
              <option value={0}>賞金：指定なし</option>
              <option value={1000}>$1k+</option>
              <option value={5000}>$5k+</option>
              <option value={10000}>$10k+</option>
              <option value={50000}>$50k+</option>
            </select>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              {opportunities.length === 0
                ? "「今すぐスキャン」でデータを取得"
                : "条件に合う機会がありません"}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className={`border rounded p-3 transition-colors ${
                    panel?.opportunity.id === o.id
                      ? "border-white bg-zinc-900"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[o.category]}`}>
                          {CATEGORY_LABELS[o.category]}
                        </span>
                        <span className="text-xs text-zinc-500">{PLATFORM_LABELS[o.platform]}</span>
                        {o.winRate !== null && o.winRate > 5 && (
                          <span className="text-xs text-emerald-400 font-medium">勝率{o.winRate}%</span>
                        )}
                      </div>
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-white transition-colors truncate block"
                      >
                        {o.title}
                      </a>
                      <div className="mt-1.5">
                        <ScoreBar score={o.score} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-base font-bold text-emerald-400">{o.prizeLabel}</div>
                      <div className={`text-xs ${
                        daysLeft(o.deadline) === "終了" ? "text-red-400" :
                        parseInt(daysLeft(o.deadline)) <= 7 ? "text-yellow-400" : "text-zinc-500"
                      }`}>
                        {daysLeft(o.deadline)}
                      </div>
                      <button
                        onClick={() => generateSubmission(o)}
                        className="block w-full text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors text-white font-medium"
                      >
                        ✨ 提出物生成
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Submission Generator Panel */}
      {panel && (
        <div className="w-1/2 border-l border-zinc-800 flex flex-col bg-zinc-900">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <div className="text-sm font-bold">提出物生成</div>
              <div className="text-xs text-zinc-400 truncate max-w-xs">{panel.opportunity.title}</div>
            </div>
            <button
              onClick={() => setPanel(null)}
              className="text-zinc-500 hover:text-white text-lg"
            >
              ×
            </button>
          </div>

          {panel.generating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400">
              <div className="animate-spin text-3xl">⚙️</div>
              <div className="text-sm">
                <div>コンペを分析中...</div>
                <div className="text-xs mt-1 text-zinc-500">審査基準・テーマ・勝ちパターンを把握しています</div>
              </div>
            </div>
          ) : panel.error ? (
            <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-6">
              エラー: {panel.error}
            </div>
          ) : panel.submission && panel.intelligence ? (
            <div className="flex-1 overflow-y-auto">
              {/* Intelligence Summary */}
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/50">
                <div className="text-xs text-zinc-400 mb-2 font-medium">審査員が見たいもの</div>
                <div className="text-sm text-white">{panel.intelligence.whatJudgesWant}</div>
                <div className="mt-2 text-xs text-emerald-400">
                  戦略: {panel.intelligence.winningAngle}
                </div>
              </div>

              {/* Quality Score */}
              <div className="px-5 py-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 font-medium">品質スコア</span>
                  <span className="text-xs text-zinc-500">{panel.submission.winProbabilityBoost}</span>
                </div>
                <QualityBar score={panel.submission.qualityScore} />

                {/* Criteria Scores */}
                <div className="mt-3 space-y-1.5">
                  {panel.submission.criteriaScores?.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-28 text-xs text-zinc-400 truncate">{c.criterion}</div>
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.score >= 70 ? "bg-emerald-500" : c.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-8 text-right">{c.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-800">
                {(["preview", "raw"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab ? "text-white border-b border-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "preview" ? "プレビュー" : "コピー用テキスト"}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                {activeTab === "preview" ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">タイトル</div>
                      <div className="font-bold text-white text-base">{panel.submission.title}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">タグライン</div>
                      <div className="text-zinc-300 italic">{panel.submission.tagline}</div>
                    </div>
                    {[
                      { key: "inspiration", label: "Inspiration" },
                      { key: "whatItDoes", label: "What it does" },
                      { key: "howWeBuiltIt", label: "How we built it" },
                      { key: "challenges", label: "Challenges" },
                      { key: "accomplishments", label: "Accomplishments" },
                      { key: "whatWeLearned", label: "What we learned" },
                      { key: "whatsNext", label: "What's next" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <div className="text-xs text-zinc-500 mb-1">{label}</div>
                        <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs">
                          {(panel.submission as unknown as Record<string, string>)[key]}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Built with</div>
                      <div className="flex flex-wrap gap-1">
                        {panel.submission.builtWith.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: "title", label: "Title" },
                      { key: "tagline", label: "Tagline" },
                      { key: "inspiration", label: "Inspiration" },
                      { key: "whatItDoes", label: "What it does" },
                      { key: "howWeBuiltIt", label: "How we built it" },
                      { key: "challenges", label: "Challenges" },
                      { key: "accomplishments", label: "Accomplishments" },
                      { key: "whatWeLearned", label: "What we learned" },
                      { key: "whatsNext", label: "What's next" },
                    ].map(({ key, label }) => (
                      <div key={key} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-500">{label}</span>
                          <button
                            onClick={() => copyToClipboard((panel.submission as unknown as Record<string, string>)[key])}
                            className="text-xs text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            コピー
                          </button>
                        </div>
                        <div className="text-xs bg-zinc-800 rounded p-2 text-zinc-300 leading-relaxed whitespace-pre-line font-mono">
                          {(panel.submission as unknown as Record<string, string>)[key]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Improvements */}
                {panel.submission.improvements && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <div className="text-xs text-zinc-400 mb-2 font-medium">改善提案</div>
                    <div className="space-y-2">
                      {panel.submission.improvements.map((imp, i) => (
                        <button
                          key={i}
                          onClick={() => improveSubmission(imp)}
                          disabled={improving}
                          className="w-full text-left text-xs p-2 border border-zinc-700 rounded hover:border-white hover:text-white transition-colors text-zinc-400 disabled:opacity-40"
                        >
                          {improving ? "改善中..." : `💡 ${imp}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
