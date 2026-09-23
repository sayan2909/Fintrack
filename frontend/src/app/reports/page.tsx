"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Download,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Percent,
  Calendar,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  PieChart,
  BarChart3,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Report {
  period: { from: string; to: string; preset: string };
  summary: { income: number; expenses: number; net: number; savingsRate: number; count: number };
  categoryBreakdown: { name: string; income: number; expenses: number; count: number; net: number }[];
  budgetPerformance: { id: string; categoryName: string; amount: string; spent: number; percentUsed: number }[];
  savingsProgress: { id: string; name: string; targetAmount: string; currentAmount: string; percentComplete: number }[];
  byPaymentMethod: { name: string; count: number }[];
}

function getPaymentIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("upi") || n.includes("phonepe") || n.includes("gpay") || n.includes("paytm")) return Smartphone;
  if (n.includes("card") || n.includes("credit") || n.includes("debit")) return CreditCard;
  if (n.includes("bank") || n.includes("transfer") || n.includes("netbanking")) return Landmark;
  return Banknote;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [preset, setPreset] = useState("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (p = preset, f = from, t = to) => {
    setLoading(true);
    try {
      let url = `/api/reports?preset=${p}`;
      if (p === "custom" && f && t) url += `&from=${f}&to=${t}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (preset !== "custom") load(preset); /* eslint-disable-next-line */ }, [preset]);

  const exportCsv = () => {
    let url = `/api/reports?preset=${preset}&format=csv`;
    if (preset === "custom" && from && to) url += `&from=${from}&to=${to}`;
    window.location.href = url;
  };

  const exportPdf = () => {
    window.print();
  };

  const totalExpenseVal = useMemo(() => {
    if (!data || data.summary.expenses <= 0) return 1;
    return data.summary.expenses;
  }, [data]);

  return (
    <AppShell>
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Reports & Statements
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <PieChart className="h-3 w-3 stroke-[2.5]" />
              Tax & Audit Ready
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Comprehensive periodic cashflow summaries, category distribution, and financial statements.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <Button variant="outline" onClick={exportPdf} className="h-9 px-3 text-xs font-semibold w-full justify-center">
            <FileText className="h-3.5 w-3.5 mr-1 text-slate-500" /> Export PDF
          </Button>
          <Button onClick={exportCsv} className="h-9 px-3 text-xs font-bold shadow-xs w-full justify-center">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Period Selector Toolbar */}
      <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-[#15181d] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-white/[0.08] dark:bg-[#0b0e11] text-xs font-semibold overflow-x-auto no-scrollbar max-w-full">
            {[
              ["monthly", "Monthly"],
              ["quarterly", "Quarterly"],
              ["yearly", "Yearly"],
              ["custom", "Custom Range"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPreset(v)}
                className={`rounded-lg px-3 sm:px-3.5 py-1.5 transition cursor-pointer text-xs font-bold whitespace-nowrap ${
                  preset === v
                    ? "bg-white text-slate-900 shadow-2xs ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-semibold dark:ring-0 font-black"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-400">to</span>
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

          {data && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-slate-900 dark:text-emerald-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.period.from} → {data.period.to}
              </span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                {data.summary.count} txns
              </span>
            </div>
          )}
        </div>
      </div>

      {loading || !data ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 sm:h-32 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60 lg:col-span-7 dark:bg-slate-800/60" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60 lg:col-span-5 dark:bg-slate-800/60" />
          </div>
        </div>
      ) : (
        <>
          {/* 4 Executive KPI Cards */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* 1. Total Income */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Inflow
                </span>
                <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-0">
                  <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                </span>
              </div>
              <div className="mt-2 sm:mt-2.5">
                <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                  {formatCurrency(data.summary.income, currency)}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Period income & revenue
                </p>
              </div>
            </div>

            {/* 2. Total Expenses */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Outflow
                </span>
                <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-0">
                  <ArrowUpRight className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                </span>
              </div>
              <div className="mt-2 sm:mt-2.5">
                <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                  {formatCurrency(data.summary.expenses, currency)}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Period expenditures
                </p>
              </div>
            </div>

            {/* 3. Net Savings */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Net Surplus
                </span>
                <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-slate-950 border border-slate-200 dark:border-white/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-0 font-black">
                  <Wallet className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 stroke-[2.5]" />
                </span>
              </div>
              <div className="mt-2 sm:mt-2.5">
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-lg sm:text-2xl font-black tracking-tight tabular-nums ${
                      data.summary.net >= 0
                        ? "text-slate-900 dark:text-white"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(data.summary.net, currency)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${
                      data.summary.net >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                    }`}
                  >
                    {data.summary.net >= 0 ? "Surplus" : "Deficit"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Retained net cashflow
                </p>
              </div>
            </div>

            {/* 4. Savings Rate */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Savings Rate
                </span>
                <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-500/15 dark:text-violet-400 dark:border-0">
                  <Percent className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                </span>
              </div>
              <div className="mt-2 sm:mt-2.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-lg sm:text-2xl font-black text-violet-600 dark:text-violet-400 tracking-tight tabular-nums">
                    {data.summary.savingsRate}%
                  </p>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Target: 20%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, ((data.summary.savingsRate || 0) / 20) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Grid */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Left Col (7 of 12): Visual Category Breakdown */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-slate-950 dark:bg-emerald-500/10 dark:text-emerald-400 font-black">
                      <BarChart3 className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Category Distribution & Statement
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {data.categoryBreakdown.length} active categories
                  </span>
                </div>

                {data.categoryBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No transactions recorded in this period.
                  </div>
                ) : (
                  <div className="mt-3.5 space-y-3.5">
                    {data.categoryBreakdown.map((c) => {
                      const sharePct = Math.round((c.expenses / totalExpenseVal) * 100);

                      return (
                        <div
                          key={c.name}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-900/40 transition hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {c.name}
                              </span>
                              <span className="rounded-full bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {c.count} txns
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs tabular-nums font-bold">
                              {c.income > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{formatCurrency(c.income, currency)}
                                </span>
                              )}
                              <span className="text-rose-600 dark:text-rose-400">
                                -{formatCurrency(c.expenses, currency)}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-extrabold ${
                                  c.net >= 0
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                                }`}
                              >
                                {formatCurrency(c.net, currency)}
                              </span>
                            </div>
                          </div>

                          {/* Horizontal Proportion Bar */}
                          {c.expenses > 0 && (
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span>Share of period spend</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {sharePct}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(3, sharePct))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Methods Breakdown */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-slate-900 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Payment Method Settlement
                  </h3>
                </div>

                {data.byPaymentMethod.length === 0 ? (
                  <p className="text-xs text-slate-400">No payment records available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {data.byPaymentMethod.map((m) => {
                      const Icon = getPaymentIcon(m.name);
                      return (
                        <div
                          key={m.name}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-900/50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-slate-950 dark:bg-emerald-500/10 dark:text-emerald-400 font-black">
                            <Icon className="h-4 w-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-900 dark:text-white">
                              {m.name}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {m.count} txn{m.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col (5 of 12): Budget Performance & Savings Goals Trackers */}
            <div className="lg:col-span-5 space-y-4">
              {/* Budget Performance with Visual Progress Bars */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Budget Utilization
                    </h3>
                  </div>
                  <Link
                    href="/budgets"
                    className="text-xs font-bold text-slate-900 hover:text-slate-700 dark:text-emerald-400 inline-flex items-center gap-0.5"
                  >
                    <span>Manage</span> <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-3.5 space-y-3">
                  {data.budgetPerformance.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No active budgets for this period.</p>
                  ) : (
                    data.budgetPerformance.map((b) => {
                      const isOver = b.percentUsed >= 100;
                      const isWarning = b.percentUsed >= 80 && b.percentUsed < 100;
                      const barColor = isOver
                        ? "bg-rose-500"
                        : isWarning
                        ? "bg-amber-500"
                        : "bg-emerald-500";

                      return (
                        <div
                          key={b.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-900/40"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {b.categoryName}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                isOver
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                                  : isWarning
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                              }`}
                            >
                              {b.percentUsed}% used
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${Math.min(100, Math.max(3, b.percentUsed))}%` }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>Spent: {formatCurrency(b.spent, currency)}</span>
                            <span>Limit: {formatCurrency(parseFloat(b.amount), currency)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Savings Goals Progress Tracker */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-slate-900 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Savings Milestone Velocity
                    </h3>
                  </div>
                  <Link
                    href="/goals"
                    className="text-xs font-bold text-slate-900 hover:text-slate-700 dark:text-emerald-400 inline-flex items-center gap-0.5"
                  >
                    <span>Goals</span> <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-3.5 space-y-3">
                  {data.savingsProgress.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No savings goals created yet.</p>
                  ) : (
                    data.savingsProgress.map((g) => {
                      const cur = parseFloat(g.currentAmount) || 0;
                      const tgt = parseFloat(g.targetAmount) || 0;
                      const pct = Math.min(100, g.percentComplete || 0);

                      return (
                        <div
                          key={g.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-900/40"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {g.name}
                            </span>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-slate-900 dark:text-emerald-400">
                              {pct}%
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                              style={{ width: `${Math.max(3, pct)}%` }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>Funded: {formatCurrency(cur, currency)}</span>
                            <span>Target: {formatCurrency(tgt, currency)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
