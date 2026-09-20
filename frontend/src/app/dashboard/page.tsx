"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  ArrowRightLeft,
  Target,
  BellRing,
  CalendarClock,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AppShell from "@/components/AppShell";
import { Card, Badge, Progress, Skeleton, EmptyState, Button } from "@/components/ui";
import { formatCurrency, formatDate, CURRENCY_SYMBOLS } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface DashData {
  cards: {
    balance: { value: number; change: number };
    income: { value: number; change: number };
    expenses: { value: number; change: number };
    savings: { value: number; rate: number };
  };
  series: { label: string; income: number; expenses: number; net: number }[];
  breakdown: { name: string; value: number }[];
  budgets: {
    id: string;
    categoryName: string;
    amount: string;
    spent: number;
    remaining: number;
    percentUsed: number;
    status: string;
  }[];
  goals: {
    id: string;
    name: string;
    targetAmount: string;
    currentAmount: string;
    targetDate: string | null;
    percentComplete: number;
    color: string;
  }[];
  recent: {
    id: string;
    description: string;
    categoryName: string | null;
    date: string;
    amount: string;
    type: string;
  }[];
  upcomingPayments?: {
    id: string;
    name: string;
    amount: number;
    type: string;
    categoryName?: string;
    frequency: string;
    paymentMethod?: string;
    dueDate: string;
    daysUntil: number;
    isDueToday: boolean;
    isDueTomorrow: boolean;
    isDueSoon: boolean;
  }[];
}

const PIE_COLORS = [
  "#4f46e5", // Executive Indigo
  "#0284c7", // Cerulean
  "#059669", // Jewel Emerald
  "#d97706", // Amber Bronze
  "#e11d48", // Crimson Rose
  "#7c3aed", // Royal Violet
  "#0891b2", // Teal
  "#db2777", // Berry
  "#475569", // Slate
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const currency = user?.currency || "INR";

  useEffect(() => {
    fetch("/api/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setData(j.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title="Your financial journey starts here."
          message="We couldn't load your dashboard. Add your first transaction to get started."
          action={
            <Link href="/transactions">
              <Button>
                <Plus className="h-4 w-4" /> Add your first transaction
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const hasTx = data.recent.length > 0;
  const savingsRate = Math.max(0, Math.min(100, data.cards.savings.rate || 0));
  const healthScore = Math.min(
    100,
    Math.round(savingsRate * 0.7 + (data.cards.income.value >= data.cards.expenses.value ? 30 : 10))
  );

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

  // Custom Dark Tooltip
  interface TooltipPayloadItem {
    dataKey?: string;
    value?: number;
  }
  const CustomChartTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const inc = payload.find((p) => p.dataKey === "income")?.value || 0;
      const exp = payload.find((p) => p.dataKey === "expenses")?.value || 0;
      const net = inc - exp;
      return (
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs dark:border-slate-800 dark:bg-[#111827]/95">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(inc, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(exp, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-5 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Net Savings</span>
              <span className={`tabular-nums ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {formatCurrency(net, currency)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name.split(" ")[0]} 👋
              </h1>

              {/* Clean, Subtle Health Score */}
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-xs shadow-2xs dark:border-slate-800 dark:bg-[#111827]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    healthScore >= 70
                      ? "bg-emerald-500"
                      : healthScore >= 40
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Health Score:</span>
                <span
                  className={`font-bold text-[11px] ${
                    healthScore >= 70
                      ? "text-emerald-600 dark:text-emerald-400"
                      : healthScore >= 40
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {healthScore}/100
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your consolidated financial position and monthly cash flow overview.
            </p>
          </div>

          {/* Clean Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link href="/accounts">
              <Button variant="outline" className="h-9 px-3.5 text-xs font-semibold">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
              </Button>
            </Link>
            <Link href="/transactions">
              <Button className="h-9 px-4 text-xs font-semibold">
                <Plus className="h-4 w-4" /> Add Transaction
              </Button>
            </Link>
          </div>
        </div>

        {showAlert && data.upcomingPayments && data.upcomingPayments.length > 0 && (() => {
          const primaryBill = data.upcomingPayments[0];
          const hasMultiple = data.upcomingPayments.length > 1;
          return (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-white dark:from-amber-950/20 dark:via-[#111827] dark:to-[#111827] p-4 sm:p-5 shadow-xs transition hover:border-amber-300 dark:border-amber-500/20 dark:hover:border-amber-500/35">
              {/* Subtle Amber Left Accent Indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-500 rounded-l-2xl" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-1 sm:pl-2">
                {/* Left: Icon & Bill Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 ring-1 ring-amber-500/20">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Upcoming Auto-Debit
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        primaryBill.isDueToday
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                          : primaryBill.isDueTomorrow
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                          : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}>
                        {primaryBill.isDueToday
                          ? "Due Today"
                          : primaryBill.isDueTomorrow
                          ? "Due Tomorrow"
                          : `Due in ${primaryBill.daysUntil} days`}
                      </span>
                      {hasMultiple && (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                          +{data.upcomingPayments.length - 1} more
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {primaryBill.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scheduled on{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(primaryBill.dueDate, "DD MMM YYYY")}
                      </span>
                      {primaryBill.paymentMethod && (
                        <> via <span className="font-medium text-slate-600 dark:text-slate-400">{primaryBill.paymentMethod}</span></>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 dark:border-slate-800/60">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Amount Due
                    </span>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {formatCurrency(primaryBill.amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/recurring"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <span>Manage Bills</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => setShowAlert(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                      title="Dismiss reminder"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4 Clean KPI Metric Cards */}
        {/* 4 Clean, Consistent KPI Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Balance */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p
              className={`mt-2.5 text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                data.cards.balance.value < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
              }`}
            >
              {formatCurrency(data.cards.balance.value, currency)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Net balance across accounts</span>
              {data.cards.balance.value < 0 ? (
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40">
                  Deficit
                </span>
              ) : (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                  Surplus
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Income */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Income
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(data.cards.income.value, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total earned this month</p>
          </div>

          {/* Card 3: Expenses */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Expenses
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(data.cards.expenses.value, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total spent this month</p>
          </div>

          {/* Card 4: Savings in Goals */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Savings in Goals
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100/80 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(data.cards.savings.value, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {data.goals.length > 0 ? `${data.goals.length} active savings goals` : "Allocated to targets"}
            </p>
          </div>
        </div>

        {!hasTx && (
          <EmptyState
            icon={<Wallet className="h-7 w-7" />}
            title="Your financial journey starts here."
            message="Add income and expenses to unlock charts, budgets and insights."
            action={
              <Link href="/transactions">
                <Button>
                  <Plus className="h-4 w-4" /> Add your first transaction
                </Button>
              </Link>
            }
          />
        )}

        {/* Charts Row */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Income vs Expenses Area Chart */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Income vs Expenses</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daily cash flow over the last 30 days</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Expenses
                  </span>
                </div>
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition"
                >
                  Analytics <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval={4}
                    axisLine={{ stroke: "#cbd5e1", opacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={58}
                    tickFormatter={formatYAxis}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#059669"
                    fill="url(#gInc)"
                    strokeWidth={2.4}
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#e11d48"
                    fill="url(#gExp)"
                    strokeWidth={2.4}
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown Donut Chart */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Expense Breakdown</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">By category this month</p>
                </div>
                <Link
                  href="/analytics"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Details →
                </Link>
              </div>

              {data.breakdown.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No recorded expenses yet this month.
                </div>
              ) : (
                <div className="relative mt-2 h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.breakdown.slice(0, 8)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {data.breakdown.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: unknown) => [formatCurrency(Number(v), currency), ""]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "14px",
                          color: "#0f172a",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                          padding: "8px 12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Metric */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Spent This Month
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {formatCurrency(data.cards.expenses.value, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown Progress */}
            {data.breakdown.length > 0 && (
              <div className="mt-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                {data.breakdown.slice(0, 4).map((b, i) => {
                  const totalExp = data.cards.expenses.value || 1;
                  const pct = Math.round((b.value / totalExp) * 100);
                  return (
                    <div key={b.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {b.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">{pct}%</span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(b.value, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(4, pct))}%`,
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Budgets & Goals Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Budget Allocation */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Budget Allocation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly category spending targets</p>
              </div>
              <Link
                href="/budgets"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data.budgets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active budgets for this month.{" "}
                <Link href="/budgets" className="font-bold text-indigo-500 hover:underline">
                  Create Budget →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.budgets.slice(0, 4).map((b) => (
                  <div key={b.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-900 dark:text-slate-100 font-bold">{b.categoryName}</span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatCurrency(b.spent, currency)} / {formatCurrency(parseFloat(b.amount), currency)}
                      </span>
                    </div>
                    <Progress value={b.percentUsed} />
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-bold ${
                          b.status === "over"
                            ? "text-rose-600 dark:text-rose-400"
                            : b.status === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {b.percentUsed}% utilized · {formatCurrency(b.remaining, currency)} remaining
                      </span>
                      {b.status !== "healthy" && (
                        <Badge tone={b.status === "over" ? "red" : "amber"}>
                          {b.status === "over" ? "Over Budget" : "Warning"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings Goals */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Savings Goals</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Milestone targets and funding status</p>
              </div>
              <Link
                href="/goals"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data.goals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active savings goals.{" "}
                <Link href="/goals" className="font-bold text-indigo-500 hover:underline">
                  Set a Goal →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.goals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ background: g.color || "#6366f1" }}
                    >
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="truncate font-bold text-slate-900 dark:text-white">{g.name}</span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums">
                          {g.percentComplete}%
                        </span>
                      </div>
                      <Progress value={g.percentComplete} />
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatCurrency(parseFloat(g.currentAmount), currency)} of{" "}
                        {formatCurrency(parseFloat(g.targetAmount), currency)}
                        {g.targetDate ? ` · target ${g.targetDate}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest financial activities logged</p>
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              All Transactions <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recent.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No transactions recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.recent.map((t) => {
                const isIncome = t.type === "income";
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-1 ring-rose-500/20"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {t.description}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {t.categoryName || "Uncategorized"} • {t.date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-black tabular-nums shrink-0 ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(parseFloat(t.amount), currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
