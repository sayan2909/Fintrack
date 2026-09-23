"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Target, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine,
  PiggyBank, Trophy, TrendingUp, Sparkles, CheckCircle2,
  Calendar, Search, X, Compass, Laptop, ShieldCheck, Car, Home,
  List, LayoutGrid, Clock, ChevronRight, AlertCircle, Zap
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency, formatDate, CURRENCY_SYMBOLS } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  description: string | null;
  color: string;
  percentComplete: number;
  remaining: number;
  daysRemaining: number | null;
  monthlyNeeded: number | null;
}

const GOAL_PRESETS = [
  { name: "Emergency Fund", targetAmount: "100000", color: "#10b981", description: "3-6 months of essential living expenses" },
  { name: "Tech / Laptop", targetAmount: "120000", color: "#6366f1", description: "Workstation, laptop & productivity gear" },
  { name: "Vacation / Travel", targetAmount: "60000", color: "#0ea5e9", description: "Year-end holiday and travel fund" },
  { name: "Vehicle Down Payment", targetAmount: "150000", color: "#f59e0b", description: "Down payment for car or two-wheeler" },
  { name: "Home Renovation", targetAmount: "200000", color: "#8b5cf6", description: "Interior upgrades, decor & furnishing" },
  { name: "Investment Corpus", targetAmount: "250000", color: "#ec4899", description: "Long-term compounding wealth milestone" },
];

const COLOR_SWATCHES = [
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#f43f5e", // Rose
];

function getGoalIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("trek") || n.includes("tour") || n.includes("travel") || n.includes("trip") || n.includes("vacation") || n.includes("holiday") || n.includes("bali")) {
    return Compass;
  }
  if (n.includes("laptop") || n.includes("tech") || n.includes("macbook") || n.includes("computer") || n.includes("phone") || n.includes("ipad")) {
    return Laptop;
  }
  if (n.includes("emergency") || n.includes("safety") || n.includes("fund") || n.includes("secure") || n.includes("rainy")) {
    return ShieldCheck;
  }
  if (n.includes("car") || n.includes("bike") || n.includes("vehicle") || n.includes("motor")) {
    return Car;
  }
  if (n.includes("home") || n.includes("house") || n.includes("renovation") || n.includes("interior") || n.includes("decor") || n.includes("flat")) {
    return Home;
  }
  if (n.includes("invest") || n.includes("corpus") || n.includes("wealth") || n.includes("stock") || n.includes("crypto") || n.includes("gold")) {
    return TrendingUp;
  }
  return Target;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [del, setDel] = useState<Goal | null>(null);
  const [money, setMoney] = useState<{ goal: Goal; action: "add" | "withdraw" } | null>(null);
  const [amt, setAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "achieved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"percent" | "target" | "date" | "name">("percent");
  const [viewMode, setViewMode] = useState<"cards" | "ledger">("cards");

  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    description: "",
    color: "#10b981",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals", { credentials: "include" });
      const json = await res.json();
      if (json.success) setGoals(json.data.goals || []);
    } catch {
      toast("Unable to load savings goals", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalSaved = useMemo(() => Math.round(goals.reduce((acc, g) => acc + (parseFloat(g.currentAmount) || 0), 0)), [goals]);
  const totalTarget = useMemo(() => Math.round(goals.reduce((acc, g) => acc + (parseFloat(g.targetAmount) || 0), 0)), [goals]);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const portfolioPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const achievedCount = useMemo(() => goals.filter((g) => g.percentComplete >= 100).length, [goals]);
  const inProgressCount = goals.length - achievedCount;

  const totalMonthlyNeeded = useMemo(() => {
    return Math.round(
      goals
        .filter((g) => g.percentComplete < 100)
        .reduce((acc, g) => acc + (g.monthlyNeeded || 0), 0)
    );
  }, [goals]);

  const nearestGoal = useMemo(() => {
    const active = goals.filter((g) => g.percentComplete < 100 && g.daysRemaining !== null);
    if (!active.length) return null;
    return [...active].sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0))[0];
  }, [goals]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      targetAmount: "",
      currentAmount: "",
      targetDate: "",
      description: "",
      color: "#10b981",
    });
    setModal(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({
      name: g.name,
      targetAmount: String(Math.round(parseFloat(g.targetAmount) || 0)),
      currentAmount: String(Math.round(parseFloat(g.currentAmount) || 0)),
      targetDate: g.targetDate ? g.targetDate.slice(0, 10) : "",
      description: g.description || "",
      color: g.color,
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/goals/${editing.id}` : "/api/goals";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Goal updated successfully" : "Goal created successfully");
      setModal(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save goal", "error");
    } finally {
      setSaving(false);
    }
  };

  const contribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!money) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${money.goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: amt, action: money.action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(money.action === "add" ? `Deposited ${formatCurrency(Math.round(parseFloat(amt)), currency)} 🎉` : "Funds withdrawn");
      setMoney(null);
      setAmt("");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to process funds", "error");
    } finally {
      setSaving(false);
    }
  };

  const quickContribute = async (g: Goal, deltaAmount: number) => {
    try {
      const res = await fetch(`/api/goals/${g.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: String(deltaAmount), action: "add" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(`Added ${formatCurrency(deltaAmount, currency)} to ${g.name} 🎉`);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Quick deposit failed", "error");
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      const res = await fetch(`/api/goals/${del.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        toast("Goal deleted");
        setDel(null);
        load();
      } else {
        toast(json.message || "Failed to delete goal", "error");
      }
    } catch {
      toast("Error deleting goal", "error");
    }
  };

  const filteredGoals = useMemo(() => {
    return goals
      .filter((g) => {
        if (statusFilter === "in_progress" && g.percentComplete >= 100) return false;
        if (statusFilter === "achieved" && g.percentComplete < 100) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return g.name.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "percent") return b.percentComplete - a.percentComplete;
        if (sortBy === "target") return parseFloat(b.targetAmount) - parseFloat(a.targetAmount);
        if (sortBy === "date") {
          if (!a.targetDate && b.targetDate) return 1;
          if (a.targetDate && !b.targetDate) return -1;
          if (!a.targetDate && !b.targetDate) return 0;
          return new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime();
        }
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [goals, statusFilter, searchQuery, sortBy]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* ── 1. Page Header ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#bbf246] shadow-xs shadow-[#bbf246]/50 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Wealth & Milestones
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Savings Goals
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Set capital targets, monitor savings velocity, and achieve financial milestones.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Switcher: Cards vs Ledger */}
            <div className="flex items-center rounded-full border border-slate-200/80 bg-slate-100/90 p-0.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#1b1f26]">
              {(["cards", "ledger"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === v
                      ? "bg-white text-slate-900 shadow-2xs dark:bg-[#bbf246] dark:text-[#0b0e11]"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {v === "cards" ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                  <span className="capitalize">{v === "cards" ? "Cards" : "Ledger"}</span>
                </button>
              ))}
            </div>

            <Button onClick={openAdd} className="h-9 px-3.5 sm:px-4 text-xs font-bold shadow-xs">
              <Plus className="h-4 w-4 mr-1 sm:mr-1.5" /> Create Goal
            </Button>
          </div>
        </div>

        {/* ── 2. Executive KPI Stat Cards (4 Columns) ───────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Total Accumulated Savings */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none dark:hover:border-slate-700/80 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Saved
              </span>
              <div className="flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-0">
                <PiggyBank className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatCurrency(totalSaved, currency)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Funded</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {portfolioPct}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${portfolioPct}%` }}
              />
            </div>
          </div>

          {/* Card 2: Target Portfolio */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none dark:hover:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Milestone
              </span>
              <div className="flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-500 dark:border-0">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(totalTarget, currency)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Gap</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatCurrency(totalRemaining, currency)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${portfolioPct}%` }}
              />
            </div>
          </div>

          {/* Card 3: Monthly Required Pace */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none dark:hover:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Pace
              </span>
              <div className="flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-500 dark:border-0">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(totalMonthlyNeeded, currency)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400">/mo</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Active</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {inProgressCount} in progress
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-700 w-full opacity-60" />
            </div>
          </div>

          {/* Card 4: Milestones Achieved */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none dark:hover:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Achieved
              </span>
              <div className="flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-500 dark:border-0">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
                {achievedCount}
              </p>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {goals.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Deadline</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                {nearestGoal?.daysRemaining ? `${nearestGoal.daysRemaining}d left` : "None"}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${goals.length ? (achievedCount / goals.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 3. Filter & Search Toolbar ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-800/80 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: "all", label: "All Goals", count: goals.length },
              { id: "in_progress", label: "In Progress", count: inProgressCount },
              { id: "achieved", label: "Achieved", count: achievedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-indigo-600 dark:text-white dark:ring-0 font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === tab.id
                      ? "bg-indigo-50 text-indigo-700 dark:bg-white/20 dark:text-white"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-44 sm:w-52 rounded-xl border border-slate-200/80 bg-white pl-8 pr-7 text-xs placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8.5 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300 cursor-pointer shadow-2xs"
            >
              <option value="percent">Sort: % Progress</option>
              <option value="target">Sort: Target Amount</option>
              <option value="date">Sort: Target Date</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Directory Content */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#111827]">
            <EmptyState
              icon={<Target className="h-8 w-8 text-emerald-500" />}
              title={goals.length === 0 ? "No savings goals created yet" : "No goals match your search"}
              message={
                goals.length === 0
                  ? "Create goals for your emergency fund, dream vacation, tech upgrades, or home deposit."
                  : "Try clearing your search query or switching filter tabs."
              }
              action={
                goals.length === 0 ? (
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-1.5" /> Create First Goal
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )
              }
            />
          </div>
        ) : viewMode === "cards" ? (
          /* ── Cards View ─────────────────────────── */
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map((g) => {
              const isAchieved = g.percentComplete >= 100;
              const currentAmt = Math.round(parseFloat(g.currentAmount) || 0);
              const targetAmt = Math.round(parseFloat(g.targetAmount) || 0);
              const remainingAmt = Math.max(0, targetAmt - currentAmt);
              const GoalIcon = getGoalIcon(g.name);
              const monthlyPace = g.monthlyNeeded ? Math.round(g.monthlyNeeded) : 0;

              return (
                <div
                  key={g.id}
                  className={`rounded-2xl border p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:shadow-md flex flex-col justify-between group relative overflow-hidden bg-white dark:bg-[#111827] ${
                    isAchieved
                      ? "border-emerald-500/40"
                      : "border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Top colored accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: g.color }}
                  />

                  <div>
                    {/* Top Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs"
                          style={{
                            backgroundColor: `${g.color}15`,
                            borderColor: `${g.color}35`,
                            color: g.color,
                          }}
                        >
                          <GoalIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                            {g.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isAchieved ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Achieved
                              </span>
                            ) : g.daysRemaining !== null ? (
                              <span
                                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                  g.daysRemaining <= 30
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {g.daysRemaining === 0
                                  ? "Due Today"
                                  : `${g.daysRemaining}d left · ${formatDate(g.targetDate!, "DD MMM YYYY")}`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Ongoing vault</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit & Delete Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(g)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
                          title="Edit Goal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDel(g)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
                          title="Delete Goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Funded Balance Display */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {formatCurrency(currentAmt, currency)}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 tabular-nums">
                            of {formatCurrency(targetAmt, currency)}
                          </span>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums"
                          style={{
                            backgroundColor: `${g.color}20`,
                            color: g.color,
                          }}
                        >
                          {g.percentComplete}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative mt-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, g.percentComplete)}%`,
                            backgroundColor: g.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric Ribbon */}
                    <div className="mt-3.5 flex items-center justify-between rounded-xl bg-slate-50/80 dark:bg-slate-900/60 px-3 py-2 border border-slate-100 dark:border-slate-800/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Remaining
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {formatCurrency(remainingAmt, currency)}
                        </span>
                      </div>
                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Monthly Pace
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {isAchieved ? "Goal Met" : monthlyPace ? `${formatCurrency(monthlyPace, currency)}/mo` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Description / Memo */}
                    {g.description && (
                      <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                        "{g.description}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Primary Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setMoney({ goal: g, action: "add" });
                        setAmt("");
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>Deposit</span>
                    </button>

                    <button
                      onClick={() => {
                        setMoney({ goal: g, action: "withdraw" });
                        setAmt("");
                      }}
                      disabled={currentAmt <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 py-2 px-3 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Goal Action Tile */}
            <button
              onClick={openAdd}
              className="rounded-2xl border-2 border-dashed border-slate-200/90 hover:border-indigo-400 bg-white/40 hover:bg-white p-6 flex flex-col items-center justify-center text-center gap-2.5 min-h-[220px] dark:border-slate-800/80 dark:hover:border-indigo-500/50 dark:bg-transparent dark:hover:bg-[#111827] transition-all group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Create New Goal</span>
                <span className="text-xs text-slate-400">Set a target milestone for your savings</span>
              </div>
            </button>
          </div>
        ) : (
          /* ── Ledger / Table View ─────────────────────────── */
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800/70 dark:bg-slate-900/60">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Milestone Name
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Target Date
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Progress
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Saved
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Target
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Remaining
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Monthly Pace
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredGoals.map((g) => {
                    const isAchieved = g.percentComplete >= 100;
                    const cur = Math.round(parseFloat(g.currentAmount) || 0);
                    const tgt = Math.round(parseFloat(g.targetAmount) || 0);
                    const rem = Math.max(0, tgt - cur);
                    const GoalIcon = getGoalIcon(g.name);
                    const pace = g.monthlyNeeded ? Math.round(g.monthlyNeeded) : 0;

                    return (
                      <tr key={g.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-xs"
                              style={{
                                backgroundColor: `${g.color}15`,
                                borderColor: `${g.color}30`,
                                color: g.color,
                              }}
                            >
                              <GoalIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{g.name}</p>
                              {g.description && <p className="text-[11px] text-slate-400 truncate max-w-xs">{g.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {g.targetDate ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatDate(g.targetDate, "DD MMM YYYY")}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, g.percentComplete)}%`,
                                  backgroundColor: g.color,
                                }}
                              />
                            </div>
                            <span className="font-bold text-xs tabular-nums text-slate-700 dark:text-slate-300">
                              {g.percentComplete}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(cur, currency)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatCurrency(tgt, currency)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {isAchieved ? "Met" : formatCurrency(rem, currency)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                          {isAchieved ? "—" : pace ? `${formatCurrency(pace, currency)}/mo` : "—"}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setMoney({ goal: g, action: "add" });
                                setAmt("");
                              }}
                              className="rounded-lg px-2 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 cursor-pointer"
                            >
                              + Add
                            </button>
                            <button
                              onClick={() => openEdit(g)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDel(g)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. Create / Edit Goal Modal ──────────────────────── */}
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Savings Goal" : "Create Savings Goal"} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {!editing && (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Popular Goal Templates
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOAL_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          name: p.name,
                          targetAmount: p.targetAmount,
                          description: p.description,
                          color: p.color,
                        })
                      }
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-left text-xs transition-all hover:border-indigo-500 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/60 cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 tabular-nums">
                        {formatCurrency(Math.round(parseFloat(p.targetAmount)), currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field label="Goal Name">
                <input
                  className={inputCls}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Trekking Gear, Emergency Cushion"
                />
              </Field>
            </div>

            <Field label={`Target Amount (${CURRENCY_SYMBOLS[currency] || currency})`}>
              <input
                className={inputCls}
                type="number"
                step="1"
                min="100"
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="50000"
              />
            </Field>

            <Field label={`Initial / Current Balance (${CURRENCY_SYMBOLS[currency] || currency})`}>
              <input
                className={inputCls}
                type="number"
                step="1"
                min="0"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                placeholder="0"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Target Date (optional)">
                <input
                  className={inputCls}
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Description or Purpose (optional)">
                <input
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Trip to Himachal with college group"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Theme Color</label>
              <div className="flex items-center gap-2.5">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full transition-transform cursor-pointer ${
                      form.color === c ? "scale-125 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 sm:col-span-2">
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Save Changes" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── 5. Deposit / Withdraw Funds Modal ────────────────── */}
        <Modal
          open={!!money}
          onClose={() => setMoney(null)}
          title={money?.action === "add" ? `Deposit to ${money?.goal.name}` : `Withdraw from ${money?.goal.name}`}
        >
          <form onSubmit={contribute} className="space-y-4">
            {(() => {
              if (!money) return null;
              const cur = Math.round(parseFloat(money.goal.currentAmount) || 0);
              const tgt = Math.round(parseFloat(money.goal.targetAmount) || 0);
              const numAmt = parseFloat(amt) || 0;
              const projectedCur = money.action === "add" ? cur + numAmt : Math.max(0, cur - numAmt);
              const projectedPct = tgt > 0 ? Math.min(100, Math.round((projectedCur / tgt) * 100)) : 0;

              return (
                <>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Current Funded Balance</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(cur, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>Target Milestone</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(tgt, currency)}
                      </span>
                    </div>
                    {numAmt > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-500 dark:text-indigo-400">Projected Progress</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {projectedPct}% ({formatCurrency(projectedCur, currency)})
                        </span>
                      </div>
                    )}
                  </div>

                  {money.action === "add" && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Quick Preset Amounts
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {[500, 1000, 2000, 5000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => setAmt(String(quick))}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition cursor-pointer tabular-nums text-center"
                          >
                            +{formatCurrency(quick, currency)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Field label={`Amount to ${money.action === "add" ? "deposit" : "withdraw"} (${CURRENCY_SYMBOLS[currency] || currency})`}>
                    <input
                      className={inputCls}
                      type="number"
                      step="1"
                      min="1"
                      max={money.action === "withdraw" ? cur : undefined}
                      required
                      value={amt}
                      onChange={(e) => setAmt(e.target.value)}
                      placeholder="e.g. 1000"
                      autoFocus
                    />
                  </Field>
                </>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setMoney(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={saving}
                className={money?.action === "add" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""}
              >
                {money?.action === "add" ? "Deposit Funds" : "Withdraw Funds"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── 6. Delete Confirm Dialog ─────────────────────────── */}
        <ConfirmDialog
          open={!!del}
          onClose={() => setDel(null)}
          onConfirm={doDelete}
          title="Delete Savings Goal?"
          message={`Are you sure you want to delete "${del?.name}"? The recorded goal progress will be removed.`}
        />
      </div>
    </AppShell>
  );
}
