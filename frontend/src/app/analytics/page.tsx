"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Percent,
  Calendar,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  BarChart2,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Badge, Button, Progress } from "@/components/ui";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = [
  "#4f46e5", // Executive Indigo
  "#0284c7", // Cerulean
  "#059669", // Jewel Emerald
  "#d97706", // Amber Bronze
  "#e11d48", // Crimson Rose
  "#7c3aed", // Royal Violet
  "#0891b2", // Teal
  "#db2777", // Berry
  "#f97316", // Tangerine
  "#475569", // Slate
];

interface Overview {
  totals: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
    count: number;
  };
  series: { label: string; income: number; expenses: number; net: number }[];
  breakdown: { name: string; value: number; color: string }[];
  incomeBreakdown: { name: string; value: number; color: string }[];
  monthlyComparison: {
    current: { income: number; expenses: number };
    previous: { income: number; expenses: number };
  };
}

interface YoYData {
  currentYear: number;
  previousYear: number;
  totals: {
    currentYear: { expenses: number; income: number; net: number };
    previousYear: { expenses: number; income: number; net: number };
    expenseGrowthPct: number;
    incomeGrowthPct: number;
  };
  monthly: {
    month: string;
    monthIndex: number;
    currentYear: { year: number; expenses: number; income: number; net: number };
    previousYear: { year: number; expenses: number; income: number; net: number };
    expenseDiff: number;
    expenseDiffPct: number;
  }[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [yoyData, setYoyData] = useState<YoYData | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive controls
  const [spotlightMetric, setSpotlightMetric] = useState<"all" | "income" | "expenses" | "net">("all");
  const [chartType, setChartType] = useState<"bar" | "area" | "net">("bar");
  const [viewGrouping, setViewGrouping] = useState<"daily" | "weekly">("daily");
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  // Series visibility toggles
  const [showIncomeSeries, setShowIncomeSeries] = useState(true);
  const [showExpenseSeries, setShowExpenseSeries] = useState(true);

  const load = async (r = range, f = from, t = to) => {
    setLoading(true);
    try {
      let url = `/api/analytics/overview?range=${r}`;
      if (r === "custom" && f && t) url += `&from=${f}&to=${t}`;
      const [res, yoyRes] = await Promise.all([
        fetch(url, { credentials: "include" }),
        fetch("/api/analytics/yoy", { credentials: "include" }),
      ]);
      const json = await res.json();
      const yoyJson = await yoyRes.json();
      if (json.success) setData(json.data);
      if (yoyJson.success) setYoyData(yoyJson.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, []);

  useEffect(() => {
    if (range !== "custom") load(range);
    /* eslint-disable-next-line */
  }, [range]);

  const mc = data?.monthlyComparison;
  const cur = mc?.current;
  const prev = mc?.previous;

  // Currency-aware axis formatter
  const sym = CURRENCY_SYMBOLS[currency] ?? "₹";
  const formatYAxis = (v: number) => {
    if (v === 0) return `${sym}0`;
    if (currency === "INR") {
      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
      if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
      if (v >= 10000) return `₹${Math.round(v / 1000)}k`;
      return `₹${v.toLocaleString("en-IN")}`;
    }
    if (v >= 1000000) return `${sym}${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${sym}${Math.round(v / 1000)}k`;
    return `${sym}${v.toLocaleString()}`;
  };

  // Aggregated data for smooth presentation (eliminates 29-day empty spikes)
  const displaySeries = useMemo(() => {
    if (!data?.series) return [];
    if (viewGrouping === "daily" || data.series.length <= 7) return data.series;

    if (viewGrouping === "weekly") {
      const weeks: { label: string; income: number; expenses: number; net: number }[] = [];
      const chunkSize = 7;
      for (let i = 0; i < data.series.length; i += chunkSize) {
        const chunk = data.series.slice(i, i + chunkSize);
        const startLabel = chunk[0].label;
        const endLabel = chunk[chunk.length - 1].label;
        const inc = chunk.reduce((s, d) => s + d.income, 0);
        const exp = chunk.reduce((s, d) => s + d.expenses, 0);
        weeks.push({
          label: `${startLabel} – ${endLabel}`,
          income: inc,
          expenses: exp,
          net: inc - exp,
        });
      }
      return weeks;
    }

    return data.series;
  }, [data?.series, viewGrouping]);

  // Custom Dual-Mode Tooltip
  interface TooltipPayloadItem {
    name?: string;
    dataKey?: string;
    value?: number;
    color?: string;
    fill?: string;
  }
  const CustomAnalyticsTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs dark:border-slate-800 dark:bg-[#111827]/95">
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-5">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: p.color || p.fill || "#6366f1" }}
                  />
                  {p.name || p.dataKey}
                </span>
                <span className="font-black tabular-nums text-slate-900 dark:text-white">
                  {typeof p.value === "number" ? formatCurrency(p.value, currency) : p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Header & Range Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Financial Analytics & Trends
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any metric card below to spotlight it on the chart.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-800/80">
              {[
                ["7d", "7D"],
                ["30d", "30D"],
                ["6m", "6M"],
                ["1y", "1Y"],
                ["custom", "Custom"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setRange(v)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    range === v
                      ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-indigo-600 dark:text-white dark:ring-0"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {range === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">to</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <Button onClick={() => load("custom", from, to)} className="h-8.5 px-3 text-xs font-bold shadow-2xs">
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : (
          <>
            {/* 4 Interactive Spotlight Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Income Card */}
              <button
                type="button"
                onClick={() =>
                  setSpotlightMetric(spotlightMetric === "income" ? "all" : "income")
                }
                className={`group relative text-left rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:bg-[#111827] dark:shadow-none ${
                  spotlightMetric === "income"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-slate-200/90 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Income
                  </span>
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20 group-hover:scale-105 transition">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {formatCurrency(data.totals.income, currency)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Credits in period</span>
                  {spotlightMetric === "income" ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Spotlight On
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-400">
                      Click to spotlight
                    </span>
                  )}
                </div>
              </button>

              {/* Expenses Card */}
              <button
                type="button"
                onClick={() =>
                  setSpotlightMetric(spotlightMetric === "expenses" ? "all" : "expenses")
                }
                className={`group relative text-left rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:bg-[#111827] dark:shadow-none ${
                  spotlightMetric === "expenses"
                    ? "border-rose-500 ring-2 ring-rose-500/20"
                    : "border-slate-200/90 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Expenses
                  </span>
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20 group-hover:scale-105 transition">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {formatCurrency(data.totals.expenses, currency)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Debits in period</span>
                  {spotlightMetric === "expenses" ? (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      Spotlight On
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-400">
                      Click to spotlight
                    </span>
                  )}
                </div>
              </button>

              {/* Net Cash Flow Card */}
              <button
                type="button"
                onClick={() =>
                  setSpotlightMetric(spotlightMetric === "net" ? "all" : "net")
                }
                className={`group relative text-left rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:bg-[#111827] dark:shadow-none ${
                  spotlightMetric === "net"
                    ? "border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-200/90 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Net Cash Flow
                  </span>
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20 group-hover:scale-105 transition">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <p
                  className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                    data.totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(data.totals.net, currency)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net balance delta</span>
                  {spotlightMetric === "net" ? (
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Spotlight On
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-400">
                      Click to spotlight
                    </span>
                  )}
                </div>
              </button>

              {/* Savings Rate Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Savings Rate
                  </span>
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/20">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {data.totals.savingsRate}%
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                      data.totals.savingsRate >= 20
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-0"
                        : data.totals.savingsRate >= 0
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-0"
                        : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-0"
                    }`}
                  >
                    {data.totals.savingsRate >= 20
                      ? "Healthy"
                      : data.totals.savingsRate >= 0
                      ? "Moderate"
                      : "Overspending"}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">of income retained</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Cash Flow Chart */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
              {/* Chart Header & Interactive View Controls */}
              <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Cash Flow Dynamics
                    </h3>
                    {spotlightMetric !== "all" && (
                      <button
                        onClick={() => setSpotlightMetric("all")}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset Filter
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {viewGrouping === "daily"
                      ? "Day-by-day transaction log"
                      : "Consolidated weekly performance"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Aggregation Toggle (Daily vs Weekly) */}
                  {range !== "7d" && (
                    <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-800/80 text-xs">
                      <button
                        onClick={() => setViewGrouping("daily")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          viewGrouping === "daily"
                            ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-0"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setViewGrouping("weekly")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          viewGrouping === "weekly"
                            ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-0"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        Weekly
                      </button>
                    </div>
                  )}

                  {/* Chart Style Switcher */}
                  <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-800/80 text-xs">
                    <button
                      onClick={() => setChartType("bar")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        chartType === "bar"
                          ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-0"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      Bars
                    </button>
                    <button
                      onClick={() => setChartType("area")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        chartType === "area"
                          ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-0"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      Wave
                    </button>
                    <button
                      onClick={() => setChartType("net")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        chartType === "net"
                          ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-0"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      Net Cash
                    </button>
                  </div>

                  {/* Interactive Clickable Legend Toggles */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowIncomeSeries(!showIncomeSeries)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer border ${
                        showIncomeSeries
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Income
                    </button>
                    <button
                      onClick={() => setShowExpenseSeries(!showExpenseSeries)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer border ${
                        showExpenseSeries
                          ? "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                          : "border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Renderer */}
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "bar" ? (
                    <BarChart
                      data={displaySeries}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval={Math.max(0, Math.floor(displaySeries.length / 8))}
                        axisLine={{ stroke: "#94a3b8", opacity: 0.3 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={58}
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                      />
                      {/* Soft indigo subtle hover cursor - NEVER harsh blinding white */}
                      <Tooltip
                        cursor={{ fill: "rgba(99, 102, 241, 0.08)", radius: 6 }}
                        content={<CustomAnalyticsTooltip />}
                      />
                      {(spotlightMetric === "all" || spotlightMetric === "income") &&
                        showIncomeSeries && (
                          <Bar
                            dataKey="income"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            name="Income"
                          />
                        )}
                      {(spotlightMetric === "all" || spotlightMetric === "expenses") &&
                        showExpenseSeries && (
                          <Bar
                            dataKey="expenses"
                            fill="#f43f5e"
                            radius={[4, 4, 0, 0]}
                            name="Expenses"
                          />
                        )}
                    </BarChart>
                  ) : chartType === "area" ? (
                    <AreaChart
                      data={displaySeries}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="areaExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval={Math.max(0, Math.floor(displaySeries.length / 8))}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={58}
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={<CustomAnalyticsTooltip />}
                      />
                      {showIncomeSeries && (
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#10b981"
                          fill="url(#areaInc)"
                          strokeWidth={2.5}
                          name="Income"
                        />
                      )}
                      {showExpenseSeries && (
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#f43f5e"
                          fill="url(#areaExp)"
                          strokeWidth={2.5}
                          name="Expenses"
                        />
                      )}
                    </AreaChart>
                  ) : (
                    <LineChart
                      data={displaySeries}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval={Math.max(0, Math.floor(displaySeries.length / 8))}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={58}
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={<CustomAnalyticsTooltip />}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#6366f1"
                        strokeWidth={2.8}
                        dot={{ r: 3, fill: "#6366f1" }}
                        activeDot={{ r: 6, fill: "#818cf8" }}
                        name="Net Cash Balance"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interactive Category Donut & Explorer */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Donut Chart with Interactive Hover Explorer */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Category Outflow Explorer
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hover over any slice or category to spotlight its details
                    </p>
                  </div>

                  {data.breakdown.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400">
                      No expense data in this period.
                    </div>
                  ) : (
                    <div className="relative mt-2 h-60 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.breakdown}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={90}
                            paddingAngle={3}
                            stroke="transparent"
                            onMouseEnter={(_, index) => setActiveCategoryIndex(index)}
                            onMouseLeave={() => setActiveCategoryIndex(null)}
                          >
                            {data.breakdown.map((b, i) => (
                              <Cell
                                key={i}
                                fill={b.color || COLORS[i % COLORS.length]}
                                opacity={
                                  activeCategoryIndex === null || activeCategoryIndex === i
                                    ? 1
                                    : 0.35
                                }
                                className="cursor-pointer transition-all duration-300"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Dynamic Morphing Donut Center */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-all">
                        {activeCategoryIndex !== null && data.breakdown[activeCategoryIndex] ? (
                          <>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                              {data.breakdown[activeCategoryIndex].name}
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                              {formatCurrency(
                                data.breakdown[activeCategoryIndex].value,
                                currency
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {Math.round(
                                (data.breakdown[activeCategoryIndex].value /
                                  (data.totals.expenses || 1)) *
                                  100
                              )}
                              % of total
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Total Outflow
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                              {formatCurrency(data.totals.expenses, currency)}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {data.breakdown.length}{" "}
                              {data.breakdown.length === 1 ? "category" : "categories"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Category Chips */}
                {data.breakdown.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {data.breakdown.slice(0, 5).map((b, i) => (
                      <div
                        key={b.name}
                        onMouseEnter={() => setActiveCategoryIndex(i)}
                        onMouseLeave={() => setActiveCategoryIndex(null)}
                        className={`flex items-center justify-between rounded-xl p-2 text-xs transition cursor-pointer ${
                          activeCategoryIndex === i
                            ? "bg-indigo-50/90 text-indigo-950 font-bold dark:bg-slate-800 dark:text-white ring-1 ring-indigo-500/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: b.color || COLORS[i % COLORS.length] }}
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                            {Math.round((b.value / (data.totals.expenses || 1)) * 100)}%
                          </span>
                          <span className="font-black text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(b.value, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Monthly Velocity & Ranked Categories */}
              <div className="flex flex-col gap-5">
                {/* Month over Month Velocity */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Monthly Velocity Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Current month vs previous month totals
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Income Velocity</span>
                      <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(cur?.income || 0, currency)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Prev: {formatCurrency(prev?.income || 0, currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expense Velocity</span>
                      <p className="mt-1 text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(cur?.expenses || 0, currency)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Prev: {formatCurrency(prev?.expenses || 0, currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ranked Top Spending */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ranked Spending Categories
                  </h3>
                  <div className="mt-3 space-y-3">
                    {data.breakdown.slice(0, 4).map((b, i) => {
                      const max = data.breakdown[0]?.value || 1;
                      const pct = Math.round((b.value / max) * 100);
                      return (
                        <div key={b.name} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-800 dark:text-slate-200">
                              #{i + 1} {b.name}
                            </span>
                            <span className="font-black text-slate-900 dark:text-white tabular-nums">
                              {formatCurrency(b.value, currency)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: b.color || COLORS[i % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {data.breakdown.length === 0 && (
                      <p className="text-xs text-slate-500 py-4 text-center">No category records.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Year-over-Year (YoY) Annual Comparison */}
            {yoyData && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Year-over-Year (YoY) Comparison
                    </h3>
                    <p className="text-xs text-slate-500">
                      Monthly spending patterns between {yoyData.previousYear} and {yoyData.currentYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
                      <span>{yoyData.previousYear}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                      <span>{yoyData.currentYear}</span>
                    </div>
                  </div>
                </div>

                {/* YoY Summary Cards */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{yoyData.currentYear} Annual Outflow</p>
                    <p className="mt-1 text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatCurrency(yoyData.totals.currentYear.expenses, currency)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      vs {formatCurrency(yoyData.totals.previousYear.expenses, currency)} in{" "}
                      {yoyData.previousYear}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expense Trend Growth</p>
                    <p
                      className={`mt-1 text-lg font-black tabular-nums ${
                        yoyData.totals.expenseGrowthPct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {yoyData.totals.expenseGrowthPct > 0
                        ? `+${yoyData.totals.expenseGrowthPct}%`
                        : `${yoyData.totals.expenseGrowthPct}%`}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {yoyData.totals.expenseGrowthPct <= 0 ? "Decreased spending" : "Increased spending"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Delta Difference</p>
                    <p
                      className={`mt-1 text-lg font-black tabular-nums ${
                        yoyData.totals.currentYear.net >= yoyData.totals.previousYear.net
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(
                        yoyData.totals.currentYear.net - yoyData.totals.previousYear.net,
                        currency
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Annual net difference</p>
                  </div>
                </div>

                {/* YoY Grouped Bar Chart */}
                <div className="mt-5 h-72 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yoyData.monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#94a3b8", opacity: 0.3 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={58}
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(99, 102, 241, 0.08)", radius: 6 }}
                        content={<CustomAnalyticsTooltip />}
                      />
                      <Bar
                        dataKey={(d) => d.previousYear.expenses}
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                        name={`${yoyData.previousYear} Expenses`}
                      />
                      <Bar
                        dataKey={(d) => d.currentYear.expenses}
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        name={`${yoyData.currentYear} Expenses`}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
