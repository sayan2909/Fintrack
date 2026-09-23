"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, Tag, Search, UtensilsCrossed, ShoppingBag,
  Car, Receipt, Clapperboard, HeartPulse, GraduationCap, Home,
  Plane, Briefcase, Laptop, Store, TrendingUp, PiggyBank, Coffee,
  Dumbbell, Gift, Smartphone, Wallet, Check, Layers, ArrowDownLeft,
  ArrowUpRight, Lock, X, ArrowUpDown, CreditCard, ShieldCheck, Filter
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";

interface CatBudget {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "healthy" | "warning" | "over";
}

interface Cat {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isDefault: boolean;
  spentThisMonth?: number;
  receivedThisMonth?: number;
  txCount?: number;
  budget?: CatBudget | null;
}

interface CatSummary {
  totalCategories: number;
  expenseCount: number;
  incomeCount: number;
  totalExpenseThisMonth: number;
  totalIncomeThisMonth: number;
  topExpenseCategory: { name: string; amount: number } | null;
  activeBudgetsCount: number;
}

function hexToRgba(hex: string, alpha = 0.2): string {
  if (!hex) return `rgba(99, 102, 241, ${alpha})`;
  let clean = hex.trim();
  if (clean.startsWith("rgb")) return clean;
  clean = clean.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((x) => x + x).join("");
  }
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    if (!isNaN(num)) {
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return clean;
}

const ICON_MAP: Record<string, any> = {
  Tag,
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Receipt,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Home,
  Plane,
  Briefcase,
  Laptop,
  Store,
  TrendingUp,
  PiggyBank,
  Coffee,
  Dumbbell,
  Gift,
  Smartphone,
  Wallet,
  CreditCard,
  ShieldCheck,
};

const ICON_OPTIONS = [
  { key: "Tag", label: "General Tag", icon: Tag },
  { key: "UtensilsCrossed", label: "Food & Dining", icon: UtensilsCrossed },
  { key: "ShoppingBag", label: "Shopping & Retail", icon: ShoppingBag },
  { key: "Car", label: "Transport & Fuel", icon: Car },
  { key: "Receipt", label: "Bills & Utilities", icon: Receipt },
  { key: "Clapperboard", label: "Entertainment", icon: Clapperboard },
  { key: "HeartPulse", label: "Health & Medical", icon: HeartPulse },
  { key: "GraduationCap", label: "Education", icon: GraduationCap },
  { key: "Home", label: "Housing & Rent", icon: Home },
  { key: "Plane", label: "Travel & Leisure", icon: Plane },
  { key: "Briefcase", label: "Salary & Career", icon: Briefcase },
  { key: "Laptop", label: "Freelance / Tech", icon: Laptop },
  { key: "Store", label: "Business / Commerce", icon: Store },
  { key: "TrendingUp", label: "Investments & Stocks", icon: TrendingUp },
  { key: "PiggyBank", label: "Savings & Funds", icon: PiggyBank },
  { key: "Coffee", label: "Cafes & Social", icon: Coffee },
  { key: "Dumbbell", label: "Fitness & Wellness", icon: Dumbbell },
  { key: "Gift", label: "Gifts & Charity", icon: Gift },
  { key: "Smartphone", label: "Subscriptions", icon: Smartphone },
  { key: "Wallet", label: "Cash & Personal", icon: Wallet },
  { key: "CreditCard", label: "EMI & Debt", icon: CreditCard },
  { key: "ShieldCheck", label: "Insurance", icon: ShieldCheck },
];

const CURATED_PALETTE = [
  "#bbf246", // FinTrack Electric Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Electric Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Neon Pink
  "#f43f5e", // Rose
  "#f97316", // Amber Orange
  "#f59e0b", // Warm Gold
  "#14b8a6", // Teal
  "#64748b", // Slate Steel
];

export default function CategoriesPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [cats, setCats] = useState<Cat[]>([]);
  const [summary, setSummary] = useState<CatSummary>({
    totalCategories: 0,
    expenseCount: 0,
    incomeCount: 0,
    totalExpenseThisMonth: 0,
    totalIncomeThisMonth: 0,
    topExpenseCategory: null,
    activeBudgetsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income" | "all">("expense");
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "spend-desc" | "tx-desc" | "default-first">("spend-desc");

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [del, setDel] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    color: CURATED_PALETTE[0],
    icon: "Tag",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data) {
        setCats(json.data.categories || []);
        if (json.data.summary) {
          setSummary(json.data.summary);
        }
      }
    } catch {
      toast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      type: activeTab === "income" ? "income" : "expense",
      color: CURATED_PALETTE[Math.floor(Math.random() * CURATED_PALETTE.length)],
      icon: "Tag",
    });
    setModal(true);
  };

  const openEdit = (c: Cat) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      type: c.type || "expense",
      color: c.color || CURATED_PALETTE[0],
      icon: c.icon || "Tag",
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = form.name.trim();
    if (!cleanName) {
      toast("Category title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          type: form.type,
          color: form.color,
          icon: form.icon,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Category updated successfully" : "New category created successfully");
      setModal(false);
      load();
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to save category", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      const res = await fetch(`/api/categories/${del.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        toast(`"${del.name}" removed successfully`);
        setDel(null);
        load();
      } else {
        toast(json.message || "Failed to delete category", "error");
      }
    } catch {
      toast("Unable to delete category", "error");
    }
  };

  const expenseCount = summary.expenseCount || cats.filter((c) => c.type === "expense").length;
  const incomeCount = summary.incomeCount || cats.filter((c) => c.type === "income").length;
  const expenseRatio = cats.length > 0 ? Math.round((expenseCount / cats.length) * 100) : 50;

  const filteredAndSorted = useMemo(() => {
    const list = cats.filter((c) => {
      const matchesTab = activeTab === "all" || c.type === activeTab;
      const matchesActive = !activeOnly || (c.txCount && c.txCount > 0);
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || (c.name || "").toLowerCase().includes(q) || (c.type || "").toLowerCase().includes(q);
      return matchesTab && matchesActive && matchesSearch;
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "spend-desc") {
        const valA = (a.spentThisMonth || 0) + (a.receivedThisMonth || 0);
        const valB = (b.spentThisMonth || 0) + (b.receivedThisMonth || 0);
        if (valB !== valA) return valB - valA;
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "tx-desc") {
        const txA = a.txCount || 0;
        const txB = b.txCount || 0;
        if (txB !== txA) return txB - txA;
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "default-first") {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

    return list;
  }, [cats, activeTab, activeOnly, search, sortBy]);

  const renderIcon = (iconKey: string, className = "h-4.5 w-4.5") => {
    const IconComponent = ICON_MAP[iconKey] || Tag;
    return <IconComponent className={className} />;
  };

  const ActiveFormIcon = ICON_MAP[form.icon] || Tag;

  return (
    <AppShell>
      <div className="space-y-5 pb-16">
        {/* Header Section */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf246]/30 bg-[#bbf246]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#bbf246]">
                <Layers className="h-3 w-3" /> Ledger & Tax Classification
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Categories & Tax Tags
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Personalize expense buckets, track monthly spend velocity, or delete unwanted categories.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              onClick={openAdd}
              className="h-9 px-4 text-xs font-black shadow-xs bg-[#bbf246] hover:bg-[#a8dc39] text-[#0b0e11] cursor-pointer rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Compact KPI Metric Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Card 1: Taxonomy & Ratio */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Categories
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-white/[0.06] dark:text-[#bbf246]">
                <Layers className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {loading ? "..." : cats.length}
                </p>
                <span className="text-xs font-semibold text-slate-400">
                  {expenseCount} Exp · {incomeCount} Inc
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 flex">
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${expenseRatio}%` }}
                />
                <div
                  className="h-full bg-[#bbf246] transition-all duration-500"
                  style={{ width: `${100 - expenseRatio}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Monthly Outflow Velocity */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Outflow
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                {loading ? "..." : formatCurrency(summary.totalExpenseThisMonth, currency)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {summary.topExpenseCategory ? `Top: ${summary.topExpenseCategory.name} (${formatCurrency(summary.topExpenseCategory.amount, currency)})` : "No outflows logged this month"}
              </p>
            </div>
          </div>

          {/* Card 3: Monthly Inflow Streams */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Inflow
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-[#bbf246]/10 dark:text-[#bbf246]">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-[#bbf246] tabular-nums">
                {loading ? "..." : formatCurrency(summary.totalIncomeThisMonth, currency)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {incomeCount} configured income streams
              </p>
            </div>
          </div>
        </div>

        {/* Filter, Search & Sorting Control Strip */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-1">
          {/* Segmented Filter Track + Active Only chip */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200/90 bg-slate-100 p-0.5 dark:border-white/[0.08] dark:bg-[#15181d]">
              {[
                { key: "expense", label: "Expenses", count: expenseCount },
                { key: "income", label: "Income", count: incomeCount },
                { key: "all", label: "All", count: cats.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    activeTab === t.key
                      ? "bg-white text-slate-900 shadow-2xs dark:bg-[#bbf246] dark:text-[#0b0e11] font-black"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === t.key
                        ? "bg-black/15 text-slate-900 dark:text-[#0b0e11]"
                        : "bg-slate-200/80 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Only Filter Chip */}
            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeOnly
                  ? "border-[#bbf246] bg-[#bbf246]/15 text-[#0b0e11] dark:text-[#bbf246]"
                  : "border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#15181d] dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Show only categories with transactions this month"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeOnly ? "bg-[#bbf246]" : "bg-slate-400"}`} />
              <span>With Activity</span>
            </button>
          </div>

          {/* Controls: Search and Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-full rounded-xl border border-slate-200/90 bg-white pl-8.5 pr-7 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-[#bbf246] focus:outline-none focus:ring-1 focus:ring-[#bbf246] dark:border-white/[0.08] dark:bg-[#15181d] dark:text-white"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs dark:border-white/[0.08] dark:bg-[#15181d]">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="spend-desc" className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">Highest Spend</option>
                <option value="tx-desc" className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">Most Activity</option>
                <option value="name-asc" className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">Name (A → Z)</option>
                <option value="name-desc" className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">Name (Z → A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Grid - Streamlined, Compact & Professional */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-white/[0.08] dark:bg-[#15181d]"
              />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
            <EmptyState
              icon={<Tag className="h-8 w-8 text-[#bbf246]" />}
              title={search ? "No matching categories" : `No categories found`}
              message={
                search
                  ? `No categories match "${search}".`
                  : activeOnly
                  ? "No categories have logged transactions this month yet."
                  : "Add custom categories to personalize your spending classification."
              }
              action={
                search || activeOnly ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setActiveOnly(false);
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={openAdd} className="h-8 px-3 text-xs font-bold bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39]">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Category
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSorted.map((c) => {
              const isIncome = c.type === "income";
              const monthAmount = isIncome ? (c.receivedThisMonth || 0) : (c.spentThisMonth || 0);
              const txCount = c.txCount || 0;
              const hasActivity = txCount > 0;
              const iconBg = hexToRgba(c.color || "#6366f1", 0.15);
              const iconBorder = hexToRgba(c.color || "#6366f1", 0.35);

              return (
                <div
                  key={c.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-[#bbf246]/40 hover:shadow-sm transition-all duration-150 dark:border-white/[0.08] dark:bg-[#15181d]"
                >
                  {/* Top Row: Icon + Name/Badges + Edit/Delete */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: iconBg,
                          border: `1px solid ${iconBorder}`,
                          color: c.color || "#6366f1",
                        }}
                      >
                        {renderIcon(c.icon, "h-5 w-5")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white" title={c.name}>
                          {c.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                              isIncome
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                            }`}
                          >
                            {c.type}
                          </span>
                          {c.isDefault && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                              <Lock className="h-2 w-2" /> Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Clean & Direct */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer transition"
                        title="Edit Category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDel(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 cursor-pointer transition"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Line: Spend Amount & Deep-Link to Ledger */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="font-black tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(monthAmount, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {hasActivity ? `(${txCount} txns)` : "(0 txns)"}
                      </span>
                    </div>

                    <Link
                      href={`/transactions?category=${encodeURIComponent(c.name)}`}
                      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-[#bbf246] transition-colors"
                      title="View all transactions in this category"
                    >
                      <span>Ledger</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Category Modal */}
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={editing ? "Edit Category Details" : "Create New Category"}
        >
          <form onSubmit={save} className="space-y-4 pt-1">
            {/* Live Interactive Card Preview */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-white/[0.08] dark:bg-[#15181d]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Badge Preview
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs"
                  style={{
                    backgroundColor: hexToRgba(form.color || "#6366f1", 0.2),
                    border: `1px solid ${hexToRgba(form.color || "#6366f1", 0.4)}`,
                    color: form.color || "#6366f1",
                  }}
                >
                  <ActiveFormIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {form.name.trim() || "Untitled Category"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                      form.type === "income"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                    }`}
                  >
                    {form.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Name */}
            <Field label="Category Title">
              <input
                className={inputCls}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cloud Hosting, Groceries, Client Retainers"
                autoFocus
              />
            </Field>

            {/* Category Type */}
            <Field label="Classification Type">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!!editing}
                  onClick={() => setForm({ ...form, type: "expense" })}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                    form.type === "expense"
                      ? "border-rose-500/50 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-400 shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#15181d] dark:text-slate-400"
                  } ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" /> Expense Outflow
                </button>
                <button
                  type="button"
                  disabled={!!editing}
                  onClick={() => setForm({ ...form, type: "income" })}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                    form.type === "income"
                      ? "border-emerald-500/50 bg-emerald-50 text-emerald-600 dark:border-[#bbf246]/40 dark:bg-[#bbf246]/10 dark:text-[#bbf246] shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#15181d] dark:text-slate-400"
                  } ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Income Stream
                </button>
              </div>
            </Field>

            {/* Icon Picker */}
            <Field label="Classification Icon">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200/90 p-2 dark:border-white/[0.08] dark:bg-black/20">
                {ICON_OPTIONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = form.icon === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setForm({ ...form, icon: item.key })}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 transition cursor-pointer ${
                        isSelected
                          ? "bg-[#bbf246] text-[#0b0e11] font-bold shadow-xs scale-102"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                      }`}
                      title={item.label}
                    >
                      <ItemIcon className="h-4 w-4" />
                      <span className="text-[9px] font-semibold truncate w-full text-center">
                        {item.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Modern Color Palette */}
            <Field label="Brand Accent Color">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {CURATED_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer ${
                      form.color === c ? "ring-2 ring-[#bbf246] ring-offset-2 dark:ring-offset-[#15181d]" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && <Check className="h-3.5 w-3.5 text-black stroke-[3]" />}
                  </button>
                ))}
                <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-slate-200/80 px-2 py-0.5 dark:border-white/[0.08]">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-5 w-5 rounded-md border-0 cursor-pointer bg-transparent"
                    title="Custom Color"
                  />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.color}</span>
                </div>
              </div>
            </Field>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <Button variant="secondary" onClick={() => setModal(false)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={saving}
                className="h-9 px-5 text-xs font-black bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39] rounded-xl shadow-xs"
              >
                {editing ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!del}
          onClose={() => setDel(null)}
          onConfirm={doDelete}
          title="Delete this category?"
          message={`Are you sure you want to remove "${del?.name}"? You can re-add it anytime.`}
        />
      </div>
    </AppShell>
  );
}
