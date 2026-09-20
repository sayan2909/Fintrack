"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  PiggyBank,
  PieChart as PieChartIcon,
  BarChart3,
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Receipt,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Home,
  Plane,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, Badge, Progress, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Budget {
  id: string;
  categoryName: string;
  amount: string;
  month: string;
  description: string | null;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "healthy" | "warning" | "over" | string;
}

interface Cat {
  id: string;
  name: string;
  type: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  Food: UtensilsCrossed,
  Shopping: ShoppingBag,
  Transport: Car,
  Bills: Receipt,
  Entertainment: Clapperboard,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  Rent: Home,
  Travel: Plane,
  Other: Tag,
};

const CATEGORY_COLORS_MAP: Record<string, string> = {
  Food: "#f59e0b",
  Shopping: "#ec4899",
  Transport: "#3b82f6",
  Bills: "#ef4444",
  Entertainment: "#8b5cf6",
  Healthcare: "#10b981",
  Education: "#0ea5e9",
  Rent: "#f97316",
  Travel: "#14b8a6",
  Other: "#64748b",
};

const CHART_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#ef4444",
  "#64748b",
];

const PRESET_AMOUNTS = ["1000", "2500", "5000", "10000", "25000"];

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState({ totalBudget: 0, totalSpent: 0, remaining: 0, percentUsed: 0 });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "warning" | "over">("all");
  const [sortBy, setSortBy] = useState<"percent" | "budget" | "spent" | "name">("percent");
  const [showCharts, setShowCharts] = useState(false);

  // Modals
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [del, setDel] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryName: "",
    amount: "",
    month: new Date().toISOString().slice(0, 7),
    description: "",
  });

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${m}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setBudgets(json.data.budgets || []);
        setSummary(json.data.summary || { totalBudget: 0, totalSpent: 0, remaining: 0, percentUsed: 0 });
      }
    } catch (err) {
      console.error("Failed to load budgets:", err);
      toast("Could not load budgets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.categories) {
          setCats(j.data.categories.filter((c: Cat) => c.type === "expense"));
        }
      })
      .catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = month === currentMonthStr;

  const changeMonthBy = (offset: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(newMonth);
    load(newMonth);
  };

  const humanReadableMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [month]);

  // Velocity calculations
  const velocityInfo = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const today = new Date();
    const isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
    const totalDays = new Date(y, m, 0).getDate();
    const passedDays = isThisMonth ? today.getDate() : month < currentMonthStr ? totalDays : 0;
    const daysRemaining = isThisMonth ? Math.max(1, totalDays - today.getDate() + 1) : month < currentMonthStr ? 0 : totalDays;

    const dailyBudget = summary.remaining > 0 && daysRemaining > 0 ? summary.remaining / daysRemaining : 0;
    const dailyAvgSpent = passedDays > 0 ? summary.totalSpent / passedDays : 0;

    return {
      totalDays,
      passedDays,
      daysRemaining,
      dailyBudget,
      dailyAvgSpent,
      isThisMonth,
    };
  }, [month, summary, currentMonthStr]);

  // Filter and sort
  const filteredBudgets = useMemo(() => {
    return budgets
      .filter((b) => {
        const matchesSearch = b.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "over"
            ? b.status === "over"
            : statusFilter === "warning"
            ? b.status === "warning"
            : b.status === "healthy";
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "percent") return b.percentUsed - a.percentUsed;
        if (sortBy === "budget") return parseFloat(b.amount) - parseFloat(a.amount);
        if (sortBy === "spent") return b.spent - a.spent;
        if (sortBy === "name") return a.categoryName.localeCompare(b.categoryName);
        return 0;
      });
  }, [budgets, searchQuery, statusFilter, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let over = 0;
    budgets.forEach((b) => {
      if (b.status === "over") over++;
      else if (b.status === "warning") warning++;
      else healthy++;
    });
    return { all: budgets.length, healthy, warning, over };
  }, [budgets]);

  // Chart data
  const chartAllocationData = useMemo(() => {
    return budgets.map((b) => ({
      name: b.categoryName,
      value: parseFloat(b.amount) || 0,
      spent: b.spent,
    }));
  }, [budgets]);

  const chartComparisonData = useMemo(() => {
    return budgets.map((b) => ({
      category: b.categoryName,
      Budget: parseFloat(b.amount) || 0,
      Spent: b.spent,
    }));
  }, [budgets]);

  const openAdd = (catName?: string) => {
    setEditing(null);
    setForm({
      categoryName: catName || (cats[0]?.name || ""),
      amount: "",
      month,
      description: "",
    });
    setModal(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setForm({
      categoryName: b.categoryName,
      amount: b.amount,
      month: b.month,
      description: b.description || "",
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/budgets/${editing.id}` : "/api/budgets";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Budget updated successfully" : "Budget created successfully");
      setModal(false);
      load(form.month);
      setMonth(form.month);
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to save budget", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      const res = await fetch(`/api/budgets/${del.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        toast("Budget deleted");
        setDel(null);
        load();
      } else {
        toast(json.message || "Failed to delete", "error");
      }
    } catch {
      toast("Failed to delete budget", "error");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header (Exact Dashboard Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Monthly Budgets
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Your category spending limits and monthly pace for {humanReadableMonth}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Clean month stepper */}
            <div className="flex items-center rounded-xl border border-slate-200/80 bg-white p-1 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <button
                onClick={() => changeMonthBy(-1)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="relative flex items-center gap-1.5 px-3">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[105px] text-center">
                  {humanReadableMonth}
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    load(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>

              <button
                onClick={() => changeMonthBy(1)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={() => openAdd()} className="h-9 px-4 text-xs font-bold shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" /> New Budget
            </Button>
          </div>
        </div>

        {/* 4 Standard Metric Cards (Identical to Dashboard layout & style) */}
        <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Budget */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Budget
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(summary.totalBudget, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {budgets.length} {budgets.length === 1 ? "category target" : "category targets"}
            </p>
          </div>

          {/* Card 2: Actual Spent */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Spent
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(summary.totalSpent, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {summary.percentUsed}% of planned budget
            </p>
          </div>

          {/* Card 3: Net Remaining */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Net Remaining
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${
                  summary.remaining >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 ring-emerald-500/20"
                    : "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 ring-rose-500/20"
                }`}
              >
                {summary.remaining >= 0 ? <PiggyBank className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
            </div>
            <p
              className={`mt-2.5 text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                summary.remaining >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {formatCurrency(Math.abs(summary.remaining), currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {summary.remaining >= 0 ? "Available left to spend" : "Budget exceeded"}
            </p>
          </div>

          {/* Card 4: Daily Rate */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Allowance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100/80 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {velocityInfo.dailyBudget > 0 ? formatCurrency(velocityInfo.dailyBudget, currency) : formatCurrency(0, currency)}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500"> /day</span>
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {velocityInfo.daysRemaining > 0 ? `${velocityInfo.daysRemaining} days left this month` : "Month concluded"}
            </p>
          </div>
        </div>

        {/* Toolbar: Segmented Tabs on Left, Analytics Toggle + Search + Sort on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented status control */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter("healthy")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "healthy"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              On Track ({statusCounts.healthy})
            </button>
            <button
              onClick={() => setStatusFilter("warning")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "warning"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Near Limit ({statusCounts.warning})
            </button>
            <button
              onClick={() => setStatusFilter("over")}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === "over"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Over Budget ({statusCounts.over})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {budgets.length > 0 && (
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  showCharts
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Charts</span>
              </button>
            )}

            <div className="relative w-40 sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-indigo-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
            >
              <option value="percent">Sort: % Used</option>
              <option value="budget">Sort: Budget</option>
              <option value="spent">Sort: Spent</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>

        {/* Collapsible Analytics Charts */}
        {showCharts && budgets.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Allocation</h3>
                <p className="text-xs text-slate-500">Distribution of planned monthly budget</p>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartAllocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {chartAllocationData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={CATEGORY_COLORS_MAP[entry.name] || CHART_PALETTE[idx % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val), currency)}
                      contentStyle={{
                        borderRadius: "12px",
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Budget vs. Actual Spent</h3>
                <p className="text-xs text-slate-500">Planned threshold vs actual expenses</p>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val), currency)}
                      contentStyle={{
                        borderRadius: "12px",
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Budget Cards Grid (Clean, matching Dashboard Budget Allocation style) */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Wallet className="h-7 w-7 text-slate-400" />}
              title={searchQuery || statusFilter !== "all" ? "No matching budgets" : `No budgets set for ${humanReadableMonth}`}
              message={
                searchQuery || statusFilter !== "all"
                  ? "Try resetting your search query or status filter."
                  : "Establish monthly category caps to maintain discipline across expenses."
              }
              action={
                searchQuery || statusFilter !== "all" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => openAdd()}>
                    <Plus className="h-4 w-4 mr-1" /> Create Budget
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBudgets.map((b) => {
              const IconComponent = CATEGORY_ICONS[b.categoryName] || Tag;
              const categoryColor = CATEGORY_COLORS_MAP[b.categoryName] || "#6366f1";
              const isOver = b.status === "over";
              const isWarning = b.status === "warning";

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:hover:border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Category Icon & Name & Action Buttons */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                          style={{ backgroundColor: categoryColor }}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {b.categoryName}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {b.description ? b.description : humanReadableMonth}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(b)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDel(b)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress details (Matching Dashboard Budget Allocation row) */}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
                          {formatCurrency(b.spent, currency)}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          / {formatCurrency(parseFloat(b.amount), currency)}
                        </span>
                      </div>

                      <Progress
                        value={b.percentUsed}
                        color={isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}
                      />

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span
                          className={`font-bold ${
                            isOver ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"
                          }`}
                        >
                          {b.percentUsed}% utilized · {formatCurrency(Math.abs(b.remaining), currency)}{" "}
                          {b.remaining >= 0 ? "remaining" : "over limit"}
                        </span>
                        <Badge tone={isOver ? "red" : isWarning ? "amber" : "green"}>
                          {isOver ? "Over Budget" : isWarning ? "Near Limit" : "On Track"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Subtle run-rate footer */}
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {velocityInfo.passedDays > 0
                        ? `Pace: ${formatCurrency(b.spent / Math.max(1, velocityInfo.passedDays), currency)}/day`
                        : "No spend yet"}
                    </span>
                    <span>
                      {isOver
                        ? "Action recommended"
                        : `${Math.round(100 - b.percentUsed)}% available`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: New / Edit Budget */}
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={editing ? `Edit ${form.categoryName} Budget` : "Create New Budget"}
        >
          <form onSubmit={save} className="space-y-4">
            <Field label="Category">
              {editing ? (
                <input
                  className={inputCls}
                  disabled
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                />
              ) : (
                <select
                  className={inputCls}
                  required
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                >
                  <option value="">Select category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label={`Budget Amount (${currency})`}>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setForm({ ...form, amount: amt })}
                    className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    +{formatCurrency(Number(amt), currency)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Month">
              <input
                className={inputCls}
                type="month"
                required
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              />
            </Field>

            <Field label="Note (Optional)">
              <input
                className={inputCls}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional purpose note"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!del}
          onClose={() => setDel(null)}
          onConfirm={doDelete}
          title="Delete Budget?"
          message={`Are you sure you want to delete the budget for ${del?.categoryName}? This will not affect existing transactions.`}
        />
      </div>
    </AppShell>
  );
}
