"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Target,
  PiggyBank,
  Repeat,
  Gauge,
  Crown,
  ArrowUpRight,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Check,
  Compass,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";

const ICONS: Record<string, typeof Sparkles> = {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Target,
  PiggyBank,
  Repeat,
  Gauge,
  Crown,
  Sparkles,
};

interface Insight {
  id: string;
  type: "positive" | "warning" | "danger" | "info";
  title: string;
  message: string;
  icon: string;
  category?: "spending" | "budget" | "goals" | "recurring" | "savings";
  impact?: "high" | "medium" | "low";
  actionUrl?: string;
  actionText?: string;
}

interface DiagnosticMetrics {
  savingsRate: number;
  budgetUtilization: number;
  activeBudgetsCount: number;
  exceededBudgetsCount: number;
  fixedCostRatio: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashflow: number;
  recurringMonthly: number;
  topCategory: { name: string; amount: number; share: number } | null;
}

export default function InsightsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const currSymbol = CURRENCY_SYMBOLS[currency] || "₹";

  const [insights, setInsights] = useState<Insight[]>([]);
  const [score, setScore] = useState(0);
  const [grade, setGrade] = useState("Stable Financial Health");
  const [gradeLetter, setGradeLetter] = useState("B");
  const [metrics, setMetrics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<"all" | "attention" | "growth">("all");

  // Interactive Simulation state
  const [simulationBoost, setSimulationBoost] = useState<number>(0);

  const fetchInsights = async () => {
    try {
      const res = await fetch("/api/insights", { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data) {
        setInsights(json.data.insights || []);
        const sc = json.data.score ?? 0;
        setScore(sc);
        setGrade(
          sc >= 75
            ? "Optimal Health"
            : sc >= 55
            ? "Good Financial Health"
            : sc >= 40
            ? "Needs Attention"
            : "Critical Attention"
        );
        setGradeLetter(sc >= 80 ? "A" : sc >= 65 ? "B" : sc >= 45 ? "C" : "D");
        if (json.data.metrics) {
          setMetrics(json.data.metrics);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  // Filtered insights
  const filteredInsights = useMemo(() => {
    if (filter === "attention") {
      return insights.filter((i) => i.type === "danger" || i.type === "warning");
    }
    if (filter === "growth") {
      return insights.filter((i) => i.type === "positive" || i.type === "info");
    }
    return insights;
  }, [insights, filter]);

  const counts = useMemo(
    () => ({
      all: insights.length,
      attention: insights.filter((i) => i.type === "danger" || i.type === "warning").length,
      growth: insights.filter((i) => i.type === "positive" || i.type === "info").length,
    }),
    [insights]
  );

  // Simulated score
  const simulatedScore = Math.min(
    100,
    Math.round(score + (simulationBoost > 0 ? Math.min(20, (simulationBoost / 2500) * 6) : 0))
  );

  // Recommended Next Steps (3 balanced horizontal tiles)
  const nextSteps = useMemo(() => {
    const steps: { id: string; title: string; desc: string; actionUrl: string; actionText: string; tag: string }[] = [];

    if (metrics?.topCategory && metrics.topCategory.share > 30) {
      steps.push({
        id: "cap-spend",
        title: `Cap spending on ${metrics.topCategory.name}`,
        desc: `${metrics.topCategory.name} represents ${metrics.topCategory.share}% of monthly expenses. Set a budget limit.`,
        actionUrl: "/budgets",
        actionText: "Set Budget",
        tag: "Budget Cap",
      });
    }

    if (metrics && metrics.savingsRate < 20) {
      steps.push({
        id: "boost-savings",
        title: "Boost savings toward 20%",
        desc: `Current savings rate is ${metrics.savingsRate}%. Automate deposits into your active savings goals.`,
        actionUrl: "/goals",
        actionText: "View Goals",
        tag: "Growth",
      });
    } else {
      steps.push({
        id: "audit-bills",
        title: "Audit recurring subscriptions",
        desc: "Review your recurring services to eliminate unused memberships.",
        actionUrl: "/recurring",
        actionText: "Review Bills",
        tag: "Fixed Costs",
      });
    }

    steps.push({
      id: "emergency-fund",
      title: "Maintain an emergency cushion",
      desc: "Maintain at least 3 months of essential living expenses in liquid cash.",
      actionUrl: "/goals",
      actionText: "Fund Cushion",
      tag: "Resilience",
    });

    return steps.slice(0, 3);
  }, [metrics]);

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AI Insights
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Sparkles className="h-3 w-3" />
              Smart Analysis
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Personalized observations, budget alerts, and cashflow recommendations tailored to your spending.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="self-start sm:self-center text-xs font-semibold py-2 px-3.5 border border-slate-200/80 dark:border-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-500" : ""}`} />
          <span>{refreshing ? "Analyzing..." : "Refresh Insights"}</span>
        </Button>
      </div>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-44 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Executive Health Overview Hero Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            {/* Top row: Score + Diagnostics + Simulator */}
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4.5">
                {/* SVG Radial Meter */}
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      strokeWidth="8"
                      className="stroke-slate-100 dark:stroke-slate-800"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      strokeWidth="8"
                      strokeDasharray={251}
                      strokeDashoffset={251 - (251 * Math.min(100, Math.max(0, score))) / 100}
                      strokeLinecap="round"
                      className={`transition-all duration-1000 ease-out ${
                        score >= 75
                          ? "stroke-emerald-500"
                          : score >= 55
                          ? "stroke-indigo-500"
                          : "stroke-amber-500"
                      }`}
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-900 tabular-nums dark:text-white">
                      {score}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      / 100
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Financial Health Diagnostic
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        score >= 75
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-0"
                          : score >= 55
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-0"
                          : "bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-0"
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      Grade {gradeLetter} • {grade}
                    </span>
                  </div>

                  <p className="mt-1 max-w-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {score >= 75
                      ? "Outstanding balance discipline. Your savings momentum is healthy and expenses are well aligned with your core targets."
                      : score >= 55
                      ? "Healthy baseline with steady cashflow discipline. Moderating top discretionary categories will lift your rating into Optimal."
                      : "Action recommended. Spending is heavily concentrated in your top category. Setting budget limits will improve stability."}
                  </p>
                </div>
              </div>

              {/* Monthly Score Boost Simulator */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Simulate Monthly Savings Boost:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: `+${currSymbol}1k`, val: 1000 },
                    { label: `+${currSymbol}2.5k`, val: 2500 },
                    { label: `+${currSymbol}5k`, val: 5000 },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setSimulationBoost(simulationBoost === btn.val ? 0 : btn.val)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        simulationBoost === btn.val
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-slate-200/80 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                  {simulationBoost > 0 && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums ml-1">
                      → {simulatedScore} pts (+{simulatedScore - score})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row: 3 Equal Horizontal Metric Pods (NO awkward wrap!) */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              {/* Pod 1: Net Cashflow */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/40">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Net Cashflow</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p
                  className={`mt-1 text-base font-black tabular-nums ${
                    (metrics?.netCashflow ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(metrics?.netCashflow ?? 0, currency)}
                </p>
                <span className="text-[10px] text-slate-400">Retained this period</span>
              </div>

              {/* Pod 2: Savings Velocity */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/40">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Savings Rate</span>
                  <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {metrics?.savingsRate ?? 0}%
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">Target: 20%</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, ((metrics?.savingsRate ?? 0) / 20) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Pod 3: Top Expense Driver */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/40">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Top Expense Category</span>
                  <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                  {metrics?.topCategory?.name || "General"}
                </p>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {metrics?.topCategory?.share || 0}% of period spend
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Priority Action Steps (3 Balanced Horizontal Cards) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Suggested Action Plan
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                High-leverage tasks to optimize score
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {nextSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none flex flex-col justify-between transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                        {step.tag}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                    <Link
                      href={step.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: AI Observations Grid with Filter Tabs */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Active Observations
                </h3>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilter("all")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    filter === "all"
                      ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/90 dark:border-slate-700 dark:bg-[#111827] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>All</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px]">
                    {counts.all}
                  </span>
                </button>

                <button
                  onClick={() => setFilter("attention")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    filter === "attention"
                      ? "bg-white text-rose-600 shadow-2xs border border-slate-200/90 dark:border-slate-700 dark:bg-[#111827] dark:text-rose-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>Needs Attention</span>
                  {counts.attention > 0 && (
                    <span className="rounded-full bg-rose-50 text-rose-700 px-1.5 py-0.2 text-[10px] dark:bg-rose-500/20 dark:text-rose-400 font-bold">
                      {counts.attention}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFilter("growth")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    filter === "growth"
                      ? "bg-white text-emerald-600 shadow-2xs border border-slate-200/90 dark:border-slate-700 dark:bg-[#111827] dark:text-emerald-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>Wins & Growth</span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.2 text-[10px] dark:bg-emerald-500/20 dark:text-emerald-400 font-bold">
                    {counts.growth}
                  </span>
                </button>
              </div>
            </div>

            {/* Proportional 2-Column Grid of Insight Cards */}
            {filteredInsights.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#111827]">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  No matching observations
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Switch to "All" to view all active algorithmic insights.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInsights.map((ins) => {
                  const Icon = ICONS[ins.icon] || Sparkles;

                  const isDanger = ins.type === "danger";
                  const isWarning = ins.type === "warning";
                  const isPositive = ins.type === "positive";

                  const iconStyle = isDanger
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                    : isWarning
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                    : isPositive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400";

                  const tagStyle = isDanger
                    ? "bg-rose-50 text-rose-700 border border-rose-200/70 dark:border-0 dark:bg-rose-500/15 dark:text-rose-400"
                    : isWarning
                    ? "bg-amber-50 text-amber-700 border border-amber-200/70 dark:border-0 dark:bg-amber-500/15 dark:text-amber-400"
                    : isPositive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:border-0 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:border-0 dark:bg-indigo-500/15 dark:text-indigo-400";

                  const tagLabel = isDanger
                    ? "Critical Alert"
                    : isWarning
                    ? "Caution"
                    : isPositive
                    ? "Goal Milestone"
                    : "Advisory Tip";

                  return (
                    <div
                      key={ins.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Icon + Category + Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyle}`}>
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {ins.category || "General"}
                            </span>
                          </div>

                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${tagStyle}`}>
                            {tagLabel}
                          </span>
                        </div>

                        {/* Title & Message */}
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {ins.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {ins.message}
                        </p>
                      </div>

                      {/* Footer CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                        <Link
                          href={ins.actionUrl || "/analytics"}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                        >
                          <span>{ins.actionText || "View Module"}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
