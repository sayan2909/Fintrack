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
  ShieldCheck,
  Flame,
  Sparkles,
  Clock,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Zap,
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
  runway?: {
    liquidReserves: number;
    avgMonthlyBurn: number;
    runwayMonths: number;
    targetBuffer: number;
    emergencyFundHealth: number;
    status: "optimal" | "adequate" | "caution";
  };
}

const PIE_COLORS = [
  "#bbf246", // Electric Lime
  "#ff6347", // Coral Orange
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#eab308", // Amber
  "#3b82f6", // Blue
  "#10b981", // Emerald
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const [timeframe, setTimeframe] = useState<"Daily" | "Weekly" | "Monthly" | "Yearly">("Daily");
  const [txFilter, setTxFilter] = useState<"all" | "expense" | "income">("all");
  const currency = user?.currency || "INR";

  useEffect(() => {
    fetch("/api/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setData(j.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setAccounts(j.data || []))
      .catch(() => {});
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
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs dark:border-white/[0.08] dark:bg-[#15181d]/95">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-white/[0.08] pb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-[#bbf246]" /> Income
              </span>
              <span className="font-bold text-slate-900 dark:text-[#bbf246] tabular-nums">{formatCurrency(inc, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-[#ff6347]" /> Expense
              </span>
              <span className="font-bold text-slate-900 dark:text-[#ff6347] tabular-nums">{formatCurrency(exp, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-5 border-t border-slate-100 dark:border-white/[0.08] pt-1.5 mt-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Net Savings</span>
              <span className={`tabular-nums ${net >= 0 ? "text-[#bbf246]" : "text-[#ff6347]"}`}>
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
      <div className="flex flex-col gap-5 pb-10">
        {/* Top Greeting & Health Badge + Quick CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {user?.name.split(" ")[0]} 👋
              </h1>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-xs shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d]">
                <span className="h-2 w-2 rounded-full bg-[#bbf246] shadow-xs shadow-[#bbf246]/50 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400">Health Score:</span>
                <span className="text-[10px] font-black text-[#0b0e11] dark:text-[#bbf246]">{healthScore}/100</span>
              </div>
            </div>
          </div>

          {/* Quick Header Action Buttons (Transfer & Add) */}
          <div className="flex items-center gap-2.5">
            <Link href="/accounts" className="flex-1 sm:flex-none">
              <Button variant="outline" className="h-9 px-3.5 text-xs font-semibold w-full sm:w-auto justify-center rounded-xl dark:border-white/[0.08] dark:bg-[#181c22] dark:hover:bg-[#20252e]">
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Transfer
              </Button>
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("fintrack-open-quick-add"))}
              className="flex-1 sm:flex-none h-9 px-4 text-xs font-black text-[#0b0e11] bg-[#bbf246] hover:bg-[#a8e030] rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-[#bbf246]/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Add Transaction
            </button>
          </div>
        </div>

        {/* Upcoming Bill Alert Banner */}
        {showAlert && data.upcomingPayments && data.upcomingPayments.length > 0 && (() => {
          const primaryBill = data.upcomingPayments[0];
          const hasMultiple = data.upcomingPayments.length > 1;
          return (
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-amber-500/[0.03] p-4 sm:p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 rounded-l-3xl" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pl-1 sm:pl-2">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Upcoming Auto-Debit
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {primaryBill.isDueToday ? "Due Today" : primaryBill.isDueTomorrow ? "Due Tomorrow" : `Due in ${primaryBill.daysUntil} days`}
                      </span>
                      {hasMultiple && (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[#1b1f26] dark:border-white/[0.06] dark:text-slate-400">
                          +{data.upcomingPayments.length - 1} more
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {primaryBill.name}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scheduled on <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(primaryBill.dueDate, "DD MMM YYYY")}</span>
                      {primaryBill.paymentMethod && <> via <span className="font-medium text-slate-600 dark:text-slate-400">{primaryBill.paymentMethod}</span></>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 dark:border-white/[0.06]">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Amount Due
                    </span>
                    <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {formatCurrency(primaryBill.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/recurring"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#1b1f26] dark:text-slate-200 dark:hover:bg-[#20252e] transition"
                    >
                      <span>Manage</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => setShowAlert(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1b1f26] dark:hover:text-slate-200 transition cursor-pointer"
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

        {/* ── Row 1: Balance Hero Card & My Cards / Accounts (Unified Theme) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Balance Hero Card */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Balance</p>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    data.cards.balance.value >= 0
                      ? "bg-[#bbf246]/15 text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {data.cards.balance.value >= 0 ? "Surplus" : "Deficit"}
                </span>
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(data.cards.balance.value, currency)}
              </h1>

              {/* "Well done!" Card matching Figma Mockup */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-[#1b1f26]">
                <div className="min-w-0 pr-2">
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Well done!</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Savings rate at <span className="font-bold text-[#0b0e11] dark:text-[#bbf246]">{Math.max(12, Math.round(data.cards.savings.rate))}%</span> this month
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#bbf246] bg-[#bbf246]/10 text-xs font-black text-[#0b0e11] dark:text-[#bbf246] shadow-sm shadow-[#bbf246]/20">
                  {Math.max(12, Math.round(data.cards.savings.rate))}%
                </div>
              </div>
            </div>

            {/* Quick Action 4-Grid matching Figma Mockup */}
            <div className="grid grid-cols-4 gap-2.5 mt-5">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("fintrack-open-quick-add"))}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-2xs dark:border-white/[0.06] dark:bg-[#1b1f26] hover:border-[#bbf246]/50 transition cursor-pointer active:scale-95"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bbf246] text-[#0b0e11] font-black shadow-xs shadow-[#bbf246]/20">
                  <Plus className="h-5 w-5 stroke-[3]" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Add</span>
              </button>

              <Link
                href="/accounts"
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-2xs dark:border-white/[0.06] dark:bg-[#1b1f26] hover:border-slate-300 dark:hover:border-white/20 transition cursor-pointer active:scale-95"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-[#20252e] text-slate-700 dark:text-white">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Transfer</span>
              </Link>

              <Link
                href="/recurring"
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-2xs dark:border-white/[0.06] dark:bg-[#1b1f26] hover:border-slate-300 dark:hover:border-white/20 transition cursor-pointer active:scale-95"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-[#20252e] text-slate-700 dark:text-white">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bills</span>
              </Link>

              <Link
                href="/analytics"
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-2xs dark:border-white/[0.06] dark:bg-[#1b1f26] hover:border-slate-300 dark:hover:border-white/20 transition cursor-pointer active:scale-95"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-[#20252e] text-slate-700 dark:text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Stats</span>
              </Link>
            </div>
          </div>

          {/* My Cards & Accounts */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">My Cards & Accounts</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Active wallets and reserve vault</p>
              </div>
              <Link href="/accounts" className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                Manage →
              </Link>
            </div>

            {/* Accounts List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {(accounts.length > 0 ? accounts.slice(0, 2) : [
                { id: "1", name: "Mastercard Vault", type: "Credit Card", balance: data.cards.balance.value * 0.65, accountNumber: "4290", color: "#bbf246" },
                { id: "2", name: "Primary Checking", type: "Bank Account", balance: data.cards.balance.value * 0.35, accountNumber: "8104", color: "#38bdf8" }
              ]).map((acc, idx) => (
                <div
                  key={acc.id || idx}
                  className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-white/[0.08] dark:from-[#1b1f26] dark:to-[#121519] flex flex-col justify-between h-28 hover:border-[#bbf246]/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{acc.name}</span>
                    <CreditCard className="h-4 w-4 text-[#bbf246]" />
                  </div>
                  <p className="text-[10px] tracking-widest text-slate-400 font-mono">
                    •••• {acc.accountNumber?.slice(-4) || (idx === 0 ? "4290" : "8104")}
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(Number(acc.balance || 0), currency)}
                  </p>
                </div>
              ))}
            </div>

            {/* Income & Expense Quick Metrics */}
            <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-[#1b1f26]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Income</span>
                <span className="text-xs font-black text-slate-900 dark:text-[#bbf246] tabular-nums">
                  +{formatCurrency(data.cards.income.value, currency)}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-[#1b1f26]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expenses</span>
                <span className="text-xs font-black text-slate-900 dark:text-[#ff6347] tabular-nums">
                  −{formatCurrency(data.cards.expenses.value, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Cash Flow Dynamics Wave Chart + Financial Health & Runway ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Wave Chart (lg:col-span-8) */}
          <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Flow Dynamics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Income and expense flow trends</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#bbf246]" /> Income
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#ff6347]" /> Expense
                  </span>
                </div>

                {/* Timeframe Selector matching Figma */}
                <div className="flex rounded-full border border-slate-200/80 bg-slate-100 p-0.5 dark:border-white/[0.06] dark:bg-[#1b1f26]">
                  {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        timeframe === t
                          ? "bg-[#bbf246] text-[#0b0e11] shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series.slice(-14)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waveInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bbf246" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#bbf246" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="waveExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6347" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ff6347" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8e96a3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8e96a3" }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#bbf246" fill="url(#waveInc)" strokeWidth={2.5} name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="#ff6347" fill="url(#waveExp)" strokeWidth={2.5} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Health & Liquid Runway (lg:col-span-4) */}
          {data.runway && (
            <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bbf246] text-[#0b0e11] font-black shadow-xs shadow-[#bbf246]/20">
                      <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Liquid Runway</h3>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Solvency Reserve</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      data.runway.status === "optimal"
                        ? "bg-[#bbf246]/15 text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {data.runway.status === "optimal" ? "Optimal" : "Adequate"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/[0.04] dark:bg-[#1b1f26]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Runway Duration</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                      {data.runway.runwayMonths > 50 ? "50+" : data.runway.runwayMonths.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">months</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    At monthly burn of <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(data.runway.avgMonthlyBurn, currency)}</span>
                  </p>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Emergency Fund Health</span>
                    <span className="text-[#0b0e11] dark:text-[#bbf246] font-bold">{data.runway.emergencyFundHealth}%</span>
                  </div>
                  <Progress value={data.runway.emergencyFundHealth} color="bg-[#bbf246]" />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Reserves: {formatCurrency(data.runway.liquidReserves, currency)}</span>
                    <span>Target: {formatCurrency(data.runway.targetBuffer, currency)}</span>
                  </div>
                </div>
              </div>

              <Link href="/accounts" className="mt-4">
                <Button variant="outline" className="w-full h-8.5 text-xs font-semibold rounded-xl dark:border-white/[0.08] dark:bg-[#1b1f26] dark:hover:bg-[#20252e]">
                  Manage Reserves <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Row 3: Transaction History + Budgets & Goals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Transaction History (lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Transaction History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Latest activity and incoming cash</p>
              </div>
              <Link href="/transactions" className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                View all →
              </Link>
            </div>

            {/* Filter pills: All | Spending | Income */}
            <div className="flex gap-1 mb-3 rounded-full border border-slate-200/80 bg-slate-100 p-0.5 dark:border-white/[0.06] dark:bg-[#1b1f26]">
              {(["all", "expense", "income"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxFilter(filter)}
                  className={`flex-1 rounded-full py-1 text-[11px] font-bold capitalize transition ${
                    txFilter === filter
                      ? "bg-white text-slate-900 dark:bg-[#252b33] dark:text-[#bbf246] shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {filter === "all" ? "All" : filter === "expense" ? "Spending" : "Income"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {data.recent
                .filter((t) => txFilter === "all" || t.type === txFilter)
                .slice(0, 6)
                .map((t) => {
                  const isInc = t.type === "income";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/[0.04] dark:bg-[#1b1f26] hover:border-slate-200 dark:hover:border-white/[0.08] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#22272e] shadow-2xs">
                          {isInc ? (
                            <ArrowDownLeft className="h-5 w-5 text-[#bbf246]" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-[#ff6347]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{t.description}</p>
                          <p className="text-[10px] text-slate-400">{t.categoryName || "General"} • {t.date}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-black tabular-nums ${isInc ? "text-[#bbf246]" : "text-slate-900 dark:text-white"}`}>
                        {isInc ? "+" : "−"}{formatCurrency(parseFloat(t.amount), currency)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Budgets & Goals (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Budget Allocation */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Budget Allocation</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Monthly spending thresholds</p>
                </div>
                <Link href="/budgets" className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                  View all →
                </Link>
              </div>

              {data.budgets.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No active budgets. <Link href="/budgets" className="font-bold text-[#bbf246]">Create one →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.budgets.slice(0, 3).map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/[0.04] dark:bg-[#1b1f26]">
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{b.categoryName}</span>
                        <span className="text-slate-400 tabular-nums">
                          {formatCurrency(b.spent, currency)} / {formatCurrency(parseFloat(b.amount), currency)}
                        </span>
                      </div>
                      <Progress value={b.percentUsed} color={b.status === "over" ? "bg-rose-500" : b.status === "warning" ? "bg-amber-400" : "bg-[#bbf246]"} />
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className={`font-bold ${b.status === "over" ? "text-rose-400" : b.status === "warning" ? "text-amber-400" : "text-[#bbf246]"}`}>
                          {b.percentUsed}% utilized · {formatCurrency(b.remaining, currency)} left
                        </span>
                        {b.status !== "healthy" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            {b.status === "over" ? "Over" : "Alert"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Savings Goals */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Savings Goals</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Funding progress</p>
                </div>
                <Link href="/goals" className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                  View all →
                </Link>
              </div>

              {data.goals.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No savings goals yet. <Link href="/goals" className="font-bold text-[#bbf246]">Set a goal →</Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.goals.slice(0, 2).map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/[0.04] dark:bg-[#1b1f26]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#bbf246]/15 text-[#0b0e11] dark:text-[#bbf246] font-bold border border-[#bbf246]/30">
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate font-bold text-slate-900 dark:text-white">{g.name}</span>
                          <span className="font-black text-slate-900 dark:text-white tabular-nums">{g.percentComplete}%</span>
                        </div>
                        <Progress value={g.percentComplete} color="bg-[#bbf246]" />
                        <p className="mt-1 text-[10px] text-slate-400 tabular-nums">
                          {formatCurrency(parseFloat(g.currentAmount), currency)} of {formatCurrency(parseFloat(g.targetAmount), currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
