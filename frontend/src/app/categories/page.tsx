"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Tag, Search, UtensilsCrossed, ShoppingBag,
  Car, Receipt, Clapperboard, HeartPulse, GraduationCap, Home,
  Plane, Briefcase, Laptop, Store, TrendingUp, PiggyBank, Coffee,
  Dumbbell, Gift, Smartphone, Wallet, Check, Sparkles, Filter,
  Layers, ArrowDownLeft, ArrowUpRight, Lock, X
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, Badge, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { CATEGORY_COLORS } from "@/lib/constants";

interface Cat {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isDefault: boolean;
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
};

const ICON_OPTIONS = [
  { key: "Tag", label: "General Tag", icon: Tag },
  { key: "UtensilsCrossed", label: "Food & Dining", icon: UtensilsCrossed },
  { key: "ShoppingBag", label: "Shopping", icon: ShoppingBag },
  { key: "Car", label: "Transport", icon: Car },
  { key: "Receipt", label: "Bills & Utilities", icon: Receipt },
  { key: "Clapperboard", label: "Entertainment", icon: Clapperboard },
  { key: "HeartPulse", label: "Health & Medical", icon: HeartPulse },
  { key: "GraduationCap", label: "Education", icon: GraduationCap },
  { key: "Home", label: "Housing & Rent", icon: Home },
  { key: "Plane", label: "Travel & Trips", icon: Plane },
  { key: "Briefcase", label: "Salary & Career", icon: Briefcase },
  { key: "Laptop", label: "Freelance / Tech", icon: Laptop },
  { key: "Store", label: "Business / Commerce", icon: Store },
  { key: "TrendingUp", label: "Investments", icon: TrendingUp },
  { key: "PiggyBank", label: "Savings", icon: PiggyBank },
  { key: "Coffee", label: "Cafes & Drinks", icon: Coffee },
  { key: "Dumbbell", label: "Fitness & Gym", icon: Dumbbell },
  { key: "Gift", label: "Gifts & Donations", icon: Gift },
  { key: "Smartphone", label: "Subscriptions", icon: Smartphone },
  { key: "Wallet", label: "Personal Cash", icon: Wallet },
];

export default function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "expense" | "income">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [del, setDel] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    color: CATEGORY_COLORS[0],
    icon: "Tag",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      const json = await res.json();
      if (json.success) setCats(json.data.categories);
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
      color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
      icon: "Tag",
    });
    setModal(true);
  };

  const openEdit = (c: Cat) => {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type,
      color: c.color || CATEGORY_COLORS[0],
      icon: c.icon || "Tag",
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Category name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
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
      const res = await fetch(`/api/categories/${del.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        toast("Category deleted");
        setDel(null);
        load();
      } else {
        toast(json.message || "Failed to delete category", "error");
      }
    } catch {
      toast("Unable to delete category", "error");
    }
  };

  const expenseCount = cats.filter((c) => c.type === "expense").length;
  const incomeCount = cats.filter((c) => c.type === "income").length;

  const filtered = useMemo(() => {
    return cats.filter((c) => {
      const matchesTab = activeTab === "all" || c.type === activeTab;
      const matchesSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase().trim());
      return matchesTab && matchesSearch;
    });
  }, [cats, activeTab, search]);

  const renderIcon = (iconKey: string, className = "h-4 w-4") => {
    const IconComponent = ICON_MAP[iconKey] || Tag;
    return <IconComponent className={className} />;
  };

  const ActiveFormIcon = ICON_MAP[form.icon] || Tag;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Tag className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Categories & Tax Tags
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Personalize expense buckets, income streams, custom badge colors, and transaction icons.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button onClick={openAdd} className="h-9 px-4 text-xs font-bold shadow-xs cursor-pointer">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className="grid gap-3.5 sm:grid-cols-3">
          {/* Total Categories */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Categories</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Layers className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? "..." : cats.length}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center font-bold text-rose-500">
                <ArrowDownLeft className="mr-0.5 h-3 w-3" /> {expenseCount} Expenses
              </span>
              <span>•</span>
              <span className="inline-flex items-center font-bold text-emerald-500">
                <ArrowUpRight className="mr-0.5 h-3 w-3" /> {incomeCount} Income
              </span>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expense Classifications</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? "..." : expenseCount}
            </p>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Applied to outflows, monthly budgets & bills
            </p>
          </div>

          {/* Income Categories */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Income Streams</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? "..." : incomeCount}
            </p>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Salary, investments, business & freelancing
            </p>
          </div>
        </div>

        {/* Controls: Tabs and Live Search Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            {[
              { key: "all", label: "All Categories", count: cats.length },
              { key: "expense", label: "Expenses", count: expenseCount },
              { key: "income", label: "Income", count: incomeCount },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === t.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === t.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search category name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-[#111827] dark:text-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
            <EmptyState
              icon={<Tag className="h-8 w-8 text-slate-400" />}
              title={search ? "No categories found" : `No ${activeTab} categories`}
              message={
                search
                  ? `No categories match the keyword "${search}". Try another search term.`
                  : "You can create customized categories with distinct colors and icons."
              }
              action={
                search ? (
                  <Button variant="secondary" onClick={() => setSearch("")} className="h-8 text-xs">
                    Clear Search
                  </Button>
                ) : (
                  <Button onClick={openAdd} className="h-8 text-xs">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Create First Category
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const isIncome = c.type === "income";
              return (
                <div
                  key={c.id}
                  className="group relative flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-[#111827] dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs transition-transform group-hover:scale-105"
                      style={{ backgroundColor: c.color || "#6366f1" }}
                    >
                      {renderIcon(c.icon, "h-5 w-5")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {c.name}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {c.type}
                        </span>
                        {c.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <Lock className="h-2.5 w-2.5" /> Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 cursor-pointer transition"
                      title="Edit Category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDel(c)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer transition"
                      title="Delete Category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
            {/* Live Preview Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Visual Badge Preview
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                  style={{ backgroundColor: form.color }}
                >
                  <ActiveFormIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {form.name.trim() || "Untitled Category"}
                  </p>
                  <span
                    className={`inline-block mt-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      form.type === "income"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}
                  >
                    {form.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Name */}
            <Field label="Category Name">
              <input
                className={inputCls}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Groceries, Gym, SaaS Subscriptions"
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
                      ? "border-rose-500/50 bg-rose-50/70 text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400"
                  } ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" /> Expense
                </button>
                <button
                  type="button"
                  disabled={!!editing}
                  onClick={() => setForm({ ...form, type: "income" })}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                    form.type === "income"
                      ? "border-emerald-500/50 bg-emerald-50/70 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400"
                  } ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Income
                </button>
              </div>
            </Field>

            {/* Icon Picker */}
            <Field label="Transaction Icon">
              <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 p-2 dark:border-slate-800">
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
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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

            {/* Color Swatches */}
            <Field label="Badge Color">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer ${
                      form.color === c ? "ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
                <div className="ml-2 flex items-center gap-1.5">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-7 w-7 rounded-lg border-0 cursor-pointer bg-transparent"
                    title="Custom Color"
                  />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.color}</span>
                </div>
              </div>
            </Field>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setModal(false)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="h-9 px-4 text-xs font-bold">
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
          message={`Are you sure you want to delete "${del?.name}"? If existing transactions use this category, you must reassign or remove them first.`}
        />
      </div>
    </AppShell>
  );
}
