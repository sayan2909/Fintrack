"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Trophy, Target, PiggyBank, Repeat, Gauge, Crown } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Badge } from "@/components/ui";

const ICONS: Record<string, typeof Sparkles> = {
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Target, PiggyBank, Repeat, Gauge, Crown, Sparkles,
};

interface Insight { type: string; title: string; message: string; icon: string }

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && (setInsights(j.data.insights), setScore(j.data.score)))
      .finally(() => setLoading(false));
  }, []);

  const tone = (t: string) => (t === "positive" ? "green" : t === "warning" ? "amber" : t === "danger" ? "red" : "indigo");

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Financial Insights</h1>
        <p className="text-xs text-slate-500 mt-0.5">Automated algorithmic analysis and health observations from your real financial activity.</p>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : (
        <>
          {/* Health Score Hero */}
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black tabular-nums shadow-xs ${
                  score >= 75
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : score >= 50
                    ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 ring-2 ring-indigo-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-2 ring-amber-500/20"
                }`}>
                  {score}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Financial Health Score</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      score >= 75
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : score >= 50
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {score >= 75 ? "Optimal" : score >= 50 ? "Stable" : "Needs Review"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {score >= 75 ? "Strong balance management and solid savings momentum." : score >= 50 ? "Steady financial habits with opportunities to optimize discretionary spending." : "Consider adjusting category spending limits to increase your monthly savings buffer."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Live Assessment</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {insights.map((ins, i) => {
              const Icon = ICONS[ins.icon] || Sparkles;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#111827] transition hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                    ins.type === "positive"
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20"
                      : ins.type === "warning"
                      ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-amber-500/20"
                      : ins.type === "danger"
                      ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20"
                      : "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 ring-indigo-500/20"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{ins.title}</h3>
                      <Badge tone={tone(ins.type) as "green"}>{ins.type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ins.message}</p>
                  </div>
                </div>
              );
            })}
            {insights.length === 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#111827]">
                No observations yet. Add transactions to generate personalized financial insights.
              </div>
            )}
          </div>

          <p className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 text-[11px] text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-500">
            Disclaimer: Insights are automated computational observations for informational tracking only and do not constitute professional investment, tax, or legal financial advice.
          </p>
        </>
      )}
    </AppShell>
  );
}
