"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Repeat, Pencil, Trash2, Power, Search,
  LayoutGrid, List, ArrowUpRight, ArrowDownLeft, Activity,
  Film, Music, Play, Wifi, Home, Briefcase, TrendingUp, Zap,
  Layers, Sparkles, X, BellRing, CalendarClock, PieChart, ChevronDown, ChevronUp, CheckCircle2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { PAYMENT_METHODS, FREQUENCIES } from "@/lib/constants";

interface Rec {
  id: string; name: string; amount: string; type: string;
  categoryName: string | null; frequency: string; startDate: string;
  endDate: string | null; paymentMethod: string; isActive: boolean;
  nextDue: string; daysUntil: number;
}

const PRESETS = [
  { name: "YouTube Premium", amount: "149", categoryName: "Entertainment", frequency: "Monthly", type: "expense", paymentMethod: "UPI" },
  { name: "Netflix", amount: "649", categoryName: "Entertainment", frequency: "Monthly", type: "expense", paymentMethod: "Credit Card" },
  { name: "Spotify", amount: "119", categoryName: "Entertainment", frequency: "Monthly", type: "expense", paymentMethod: "UPI" },
  { name: "House Rent", amount: "15000", categoryName: "Rent", frequency: "Monthly", type: "expense", paymentMethod: "Bank Transfer" },
  { name: "Broadband", amount: "999", categoryName: "Bills", frequency: "Monthly", type: "expense", paymentMethod: "Bank Transfer" },
  { name: "SIP Investment", amount: "5000", categoryName: "Investment", frequency: "Monthly", type: "expense", paymentMethod: "Bank Transfer" },
  { name: "Salary", amount: "75000", categoryName: "Salary", frequency: "Monthly", type: "income", paymentMethod: "Bank Transfer" },
];

const CAT_COLORS = ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

function getBrand(name: string, type: string) {
  const n = name.toLowerCase();
  if (type === "income") return { Icon: Briefcase, color: "#10b981", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-500/20" };
  if (n.includes("youtube")) return { Icon: Play, color: "#ef4444", bg: "bg-red-500/10 dark:bg-red-500/15", text: "text-red-500 dark:text-red-400", border: "border-red-500/20" };
  if (n.includes("netflix") || n.includes("hotstar") || n.includes("disney") || n.includes("prime")) return { Icon: Film, color: "#f43f5e", bg: "bg-rose-500/10 dark:bg-rose-500/15", text: "text-rose-500 dark:text-rose-400", border: "border-rose-500/20" };
  if (n.includes("spotify") || n.includes("music") || n.includes("apple music")) return { Icon: Music, color: "#10b981", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-500/20" };
  if (n.includes("rent") || n.includes("house") || n.includes("flat") || n.includes("maintenance")) return { Icon: Home, color: "#f59e0b", bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-500 dark:text-amber-400", border: "border-amber-500/20" };
  if (n.includes("broadband") || n.includes("wifi") || n.includes("internet") || n.includes("jio") || n.includes("airtel")) return { Icon: Wifi, color: "#0ea5e9", bg: "bg-sky-500/10 dark:bg-sky-500/15", text: "text-sky-500 dark:text-sky-400", border: "border-sky-500/20" };
  if (n.includes("sip") || n.includes("invest") || n.includes("mutual") || n.includes("zerodha") || n.includes("groww")) return { Icon: TrendingUp, color: "#8b5cf6", bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-500 dark:text-violet-400", border: "border-violet-500/20" };
  if (n.includes("bill") || n.includes("electric") || n.includes("gas") || n.includes("utility") || n.includes("water")) return { Icon: Zap, color: "#eab308", bg: "bg-yellow-500/10 dark:bg-yellow-500/15", text: "text-yellow-500 dark:text-yellow-400", border: "border-yellow-500/20" };
  if (n.includes("gym") || n.includes("fitness") || n.includes("cult")) return { Icon: Activity, color: "#f97316", bg: "bg-orange-500/10 dark:bg-orange-500/15", text: "text-orange-500 dark:text-orange-400", border: "border-orange-500/20" };
  return { Icon: Repeat, color: "#10b981", bg: "bg-emerald-500/10 dark:bg-emerald-500/10", text: "text-slate-900 dark:text-emerald-400", border: "border-emerald-500/20" };
}

export default function RecurringPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [items, setItems] = useState<Rec[]>([]);
  const [summary, setSummary] = useState({ monthlyIn: 0, monthlyOut: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [del, setDel] = useState<Rec | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "duesoon" | "paused">("all");
  const [freqFilter, setFreqFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nextDue" | "amount" | "name">("nextDue");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAlert, setShowAlert] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", amount: "", type: "expense", categoryName: "",
    frequency: "Monthly", startDate: new Date().toISOString().slice(0, 10),
    endDate: "", paymentMethod: "Bank Transfer"
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring", { credentials: "include" });
      const json = await res.json();
      if (json.success) { setItems(json.data.recurring); setSummary(json.data.summary); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "", amount: "", type: "expense", categoryName: "",
      frequency: "Monthly", startDate: new Date().toISOString().slice(0, 10),
      endDate: "", paymentMethod: "Bank Transfer"
    });
    setModal(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setForm({
      name: r.name, amount: r.amount, type: r.type,
      categoryName: r.categoryName || "", frequency: r.frequency,
      startDate: r.startDate, endDate: r.endDate || "",
      paymentMethod: r.paymentMethod
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editing ? `/api/recurring/${editing.id}` : "/api/recurring";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, endDate: form.endDate || undefined })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Updated successfully" : "Created successfully");
      setModal(false);
      load();
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Rec) => {
    setTogglingId(r.id);
    try {
      const res = await fetch(`/api/recurring/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !r.isActive })
      });
      const json = await res.json();
      if (json.success) {
        toast(r.isActive ? "Subscription paused" : "Subscription resumed");
        load();
      }
    } finally {
      setTogglingId(null);
    }
  };

  const markAsPaid = async (r: Rec) => {
    setPayingId(r.id);
    try {
      const res = await fetch(`/api/recurring/${r.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to mark as paid");
      toast(json.message || `Marked "${r.name}" as paid! Next cycle scheduled.`);
      load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to record payment", "error");
    } finally {
      setPayingId(null);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    const res = await fetch(`/api/recurring/${del.id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (json.success) {
      toast("Subscription deleted");
      setDel(null);
      load();
    } else {
      toast(json.message, "error");
    }
  };

  const activeCount = useMemo(() => items.filter(i => i.isActive).length, [items]);
  const pausedCount = useMemo(() => items.filter(i => !i.isActive).length, [items]);
  const netMonthly = summary.monthlyIn - summary.monthlyOut;
  const projectedAnnual = Math.round(summary.monthlyOut * 12);

  const dueSoon = useMemo(() => items.filter(i => i.isActive && i.daysUntil <= 7).sort((a, b) => a.daysUntil - b.daysUntil), [items]);
  const nextUp = dueSoon[0] ?? items.filter(i => i.isActive).sort((a, b) => a.daysUntil - b.daysUntil)[0] ?? null;

  const catBreakdown = useMemo(() => {
    const exp = items.filter(i => i.isActive && i.type === "expense");
    const total = exp.reduce((acc, i) => acc + parseFloat(i.amount), 0);
    if (!total) return [];
    const map: Record<string, number> = {};
    exp.forEach(i => {
      const k = i.categoryName || "Other";
      map[k] = (map[k] || 0) + parseFloat(i.amount);
    });
    return Object.entries(map)
      .map(([name, amt]) => ({ name, amount: amt, pct: Math.round((amt / total) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  }, [items]);

  const formMonthly = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const f = form.frequency.toLowerCase();
    if (f === "daily") return amt * 30;
    if (f === "weekly") return amt * 4.33;
    if (f === "yearly") return amt / 12;
    return amt;
  }, [form.amount, form.frequency]);

  const filtered = useMemo(() => {
    return items
      .filter(r => {
        if (statusFilter === "active" && !r.isActive) return false;
        if (statusFilter === "paused" && r.isActive) return false;
        if (statusFilter === "duesoon" && (!r.isActive || r.daysUntil > 7)) return false;
        if (freqFilter !== "all" && r.frequency.toLowerCase() !== freqFilter.toLowerCase()) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.name.toLowerCase().includes(q) ||
            (r.categoryName || "").toLowerCase().includes(q) ||
            r.paymentMethod.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "nextDue") {
          if (!a.isActive && b.isActive) return 1;
          if (a.isActive && !b.isActive) return -1;
          return a.daysUntil - b.daysUntil;
        }
        if (sortBy === "amount") {
          return parseFloat(b.amount) - parseFloat(a.amount);
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [items, statusFilter, freqFilter, searchQuery, sortBy]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* ── 1. Page Header ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-xs animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recurring Hub</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Subscriptions & Bills
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage automated commitments, renewal cycles, and recurring cash flow.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center rounded-full border border-slate-200/80 bg-white p-1 shadow-xs dark:border-white/[0.08] dark:bg-[#1b1f26]">
              {(["table", "grid"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === v
                      ? "bg-white text-slate-900 shadow-2xs dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {v === "table" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                  <span className="capitalize">{v === "table" ? "Ledger" : "Cards"}</span>
                </button>
              ))}
            </div>

            <Button onClick={openAdd} className="h-9 px-3.5 sm:px-4 text-xs font-bold shadow-xs">
              <Plus className="h-4 w-4 mr-1 sm:mr-1.5" /> Add Subscription
            </Button>
          </div>
        </div>

        {showAlert && nextUp && nextUp.daysUntil <= 7 && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-white dark:from-amber-950/20 dark:via-[#111827] dark:to-[#111827] p-4 sm:p-5 shadow-xs transition hover:border-amber-300 dark:border-amber-500/20 dark:hover:border-amber-500/35">
            {/* Subtle Amber Left Accent Stripe */}
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
                      nextUp.daysUntil === 0
                        ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 ring-1 ring-rose-500/30"
                        : nextUp.daysUntil <= 1
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-500/30"
                        : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {nextUp.daysUntil === 0
                        ? "Due Today"
                        : nextUp.daysUntil === 1
                        ? "Due Tomorrow"
                        : `Due in ${nextUp.daysUntil} days`}
                    </span>
                    {dueSoon.length > 1 && (
                      <span className="rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        +{dueSoon.length - 1} more this week
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {nextUp.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Scheduled on{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(nextUp.nextDue, "DD MMM YYYY")}
                    </span>
                    {nextUp.paymentMethod && (
                      <> via <span className="font-medium text-slate-600 dark:text-slate-400">{nextUp.paymentMethod}</span></>
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
                    {formatCurrency(parseFloat(nextUp.amount), currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markAsPaid(nextUp)}
                    disabled={payingId === nextUp.id || !nextUp.isActive}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40 transition cursor-pointer dark:bg-emerald-500/15 dark:text-emerald-400"
                    title="Mark paid & record transaction now"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{payingId === nextUp.id ? "Processing..." : "Mark Paid"}</span>
                  </button>
                  <button
                    onClick={() => toggleActive(nextUp)}
                    disabled={togglingId === nextUp.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Power className="h-3 w-3" />
                    <span>{nextUp.isActive ? "Pause Debit" : "Resume"}</span>
                  </button>
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
        )}

        {/* ── 3. Clean Dashboard-Style KPI Cards ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Monthly Outflow */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Outflow</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(summary.monthlyOut, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatCurrency(projectedAnnual, currency)}/yr
              </span> projected
            </p>
          </div>

          {/* Card 2: Recurring Inflow */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recurring Inflow</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(summary.monthlyIn, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Salaries & regular receivables
            </p>
          </div>

          {/* Card 3: Net Cash Delta */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Delta</span>
              <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl ring-1 ${
                netMonthly >= 0
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-400 ring-emerald-500/20"
                  : "bg-amber-50 text-amber-600 border border-amber-100/80 dark:bg-amber-500/10 dark:text-amber-400 ring-amber-500/20"
              }`}>
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className={`mt-2 text-lg sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums ${
              netMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
            }`}>
              {formatCurrency(netMonthly, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {netMonthly >= 0 ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Surplus after bills</span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">Committed monthly burn</span>
              )}
            </p>
          </div>

          {/* Card 4: Active Commitments */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Commitments</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100/80 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
                <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                {activeCount}
              </p>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">/ {items.length} total</span>
            </div>
            <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {dueSoon.length > 0 ? (
                <span className="font-semibold text-amber-600 dark:text-amber-400">{dueSoon.length} due within 7 days</span>
              ) : (
                <span>All cycles on schedule</span>
              )}
            </p>
          </div>
        </div>

        {/* ── 4. Master Subscription Directory ───────────────── */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none overflow-hidden">

          {/* Clean Unified Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/70">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 w-full lg:w-auto">
              {[
                { id: "all", label: "All", count: items.length },
                { id: "active", label: "Active", count: activeCount },
                { id: "duesoon", label: "Due Soon", count: dueSoon.length },
                { id: "paused", label: "Paused", count: pausedCount },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold font-bold shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === tab.id
                      ? "bg-black/15 text-slate-950"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Controls: Search, Frequency, Sort, Insights Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 w-44 sm:w-52 rounded-xl border border-slate-200/80 bg-white pl-8 pr-7 text-xs placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <select
                value={freqFilter}
                onChange={e => setFreqFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Cycles</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="h-9 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 cursor-pointer"
              >
                <option value="nextDue">Sort: Next Due</option>
                <option value="amount">Sort: Cost (High to Low)</option>
                <option value="name">Sort: Name (A-Z)</option>
              </select>

              {/* Collapsible Analytics Toggle */}
              <button
                onClick={() => setShowInsights(prev => !prev)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 h-9 text-xs font-semibold transition-all cursor-pointer ${
                  showInsights
                    ? "border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-emerald-400"
                    : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800/60"
                }`}
                title="Toggle spend distribution and projections"
              >
                <PieChart className="h-3.5 w-3.5 text-slate-900 dark:text-emerald-400" />
                <span className="hidden sm:inline">Analytics</span>
                {showInsights ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Optional Collapsible Analytics Drawer */}
          {showInsights && (
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Allocation */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-900 dark:text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Spend by Category</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {catBreakdown.length} {catBreakdown.length === 1 ? "category" : "categories"}
                    </span>
                  </div>

                  {catBreakdown.length > 0 ? (
                    <>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex mb-3">
                        {catBreakdown.map((cat, idx) => (
                          <div
                            key={cat.name}
                            style={{
                              width: `${cat.pct}%`,
                              backgroundColor: CAT_COLORS[idx % CAT_COLORS.length]
                            }}
                            title={`${cat.name}: ${cat.pct}%`}
                            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                          />
                        ))}
                      </div>

                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {catBreakdown.map((cat, idx) => (
                          <div key={cat.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}
                              />
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                              <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {cat.pct}%
                              </span>
                            </div>
                            <span className="font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                              {formatCurrency(cat.amount, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">No active category spend.</p>
                  )}
                </div>

                {/* Annual Projections */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-slate-50 dark:bg-white/[0.04] dark:border-emerald-500/20 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-slate-900 dark:text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-emerald-400">Annual Outlook</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-900 dark:text-emerald-400">
                        Projections
                      </span>
                    </div>

                    <p className="text-2xl font-black text-slate-900 dark:text-emerald-400 tracking-tight tabular-nums">
                      {formatCurrency(projectedAnnual, currency)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Estimated 12-month recurring expenditure based on active commitments.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Average per Service:</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(activeCount ? Math.round(summary.monthlyOut / activeCount) : 0, currency)} / mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Directory Content */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={<Repeat className="h-8 w-8 text-emerald-500" />}
                title={items.length === 0 ? "No subscriptions yet" : "No subscriptions match your filters"}
                message={items.length === 0 ? "Track recurring expenses like Netflix, gym, rent, SIP investments, or salaries." : "Try clearing your search query or switching filter tabs."}
                action={items.length === 0 ? (
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add First Subscription
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => { setStatusFilter("all"); setFreqFilter("all"); setSearchQuery(""); }}>
                    Clear All Filters
                  </Button>
                )}
              />
            </div>
          ) : viewMode === "table" ? (
            /* ── Table / Ledger View ──────────────────────────── */
            <div>
              {/* Desktop / Tablet Full Table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800/70 dark:bg-slate-900/60">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscription & Method</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Cycle</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Renewal</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Cycle Cost</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Monthly Equiv.</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filtered.map(r => {
                    const brand = getBrand(r.name, r.type);
                    const amt = parseFloat(r.amount);
                    const isToggling = togglingId === r.id;
                    const freqLower = r.frequency.toLowerCase();
                    const monthly = freqLower === "yearly" ? amt / 12 : freqLower === "weekly" ? amt * 4.33 : freqLower === "daily" ? amt * 30 : amt;

                    return (
                      <tr
                        key={r.id}
                        className={`group transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${!r.isActive ? "opacity-50 hover:opacity-80" : ""}`}
                      >
                        {/* Subscription & Method */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${brand.bg} ${brand.text} ${brand.border}`}>
                              <brand.Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-emerald-500 transition-colors truncate">
                                {r.name}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                via {r.paymentMethod}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                            {r.categoryName || "General"}
                          </span>
                        </td>

                        {/* Billing Cycle */}
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {r.frequency}
                          </span>
                        </td>

                        {/* Next Renewal */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                              {formatDate(r.nextDue, "DD MMM YYYY")}
                            </span>
                            {r.isActive ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                r.daysUntil === 0
                                  ? "bg-rose-500/15 text-rose-500 dark:text-rose-400 ring-1 ring-rose-500/25"
                                  : r.daysUntil <= 3
                                  ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 ring-1 ring-amber-500/25"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {r.daysUntil === 0 ? "Today" : r.daysUntil === 1 ? "Tomorrow" : `in ${r.daysUntil}d`}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-slate-800">
                                Paused
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actual Cycle Cost */}
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                            {formatCurrency(amt, currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">/{r.frequency.slice(0, 2).toLowerCase()}</span>
                        </td>

                        {/* Effective Monthly Cost */}
                        <td className="px-4 py-4 text-right">
                          <span className={`text-sm font-black tabular-nums ${
                            r.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"
                          }`}>
                            {r.type === "income" ? "+" : "−"}{formatCurrency(monthly, currency)}
                          </span>
                          <p className="text-[10px] text-slate-400">/mo</p>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => toggleActive(r)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                              r.isActive
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {r.isActive ? "Active" : "Paused"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => markAsPaid(r)}
                              disabled={payingId === r.id || !r.isActive}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40 transition cursor-pointer dark:bg-emerald-500/15 dark:text-emerald-400"
                              title="Mark as paid (creates transaction & moves cycle forward)"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden sm:inline">{payingId === r.id ? "Paying..." : "Pay"}</span>
                            </button>
                            <button
                              onClick={() => openEdit(r)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDel(r)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
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

              {/* Mobile Native Card View (md:hidden) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 md:hidden">
                {filtered.map(r => {
                  const brand = getBrand(r.name, r.type);
                  const amt = parseFloat(r.amount);
                  const isToggling = togglingId === r.id;
                  const freqLower = r.frequency.toLowerCase();
                  const monthly = freqLower === "yearly" ? amt / 12 : freqLower === "weekly" ? amt * 4.33 : freqLower === "daily" ? amt * 30 : amt;

                  return (
                    <div key={r.id} className={`p-4 transition ${!r.isActive ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${brand.bg} ${brand.text} ${brand.border}`}>
                            <brand.Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {r.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {r.categoryName || "General"} · via {r.paymentMethod}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-base font-black tabular-nums ${r.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"}`}>
                            {r.type === "income" ? "+" : "−"}{formatCurrency(amt, currency)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">/{r.frequency.slice(0, 2).toLowerCase()} (~{formatCurrency(monthly, currency)}/mo)</p>
                        </div>
                      </div>

                      {/* Renewal Badge & Actions Strip */}
                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100/80 dark:border-slate-800/50">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Next:</span>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {formatDate(r.nextDue, "DD MMM")}
                          </span>
                          {r.isActive && (
                            <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                              r.daysUntil === 0
                                ? "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                                : r.daysUntil <= 3
                                ? "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {r.daysUntil === 0 ? "Today" : r.daysUntil === 1 ? "1d" : `${r.daysUntil}d`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => markAsPaid(r)}
                            disabled={payingId === r.id || !r.isActive}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{payingId === r.id ? "..." : "Pay"}</span>
                          </button>
                          <button
                            onClick={() => toggleActive(r)}
                            disabled={isToggling}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-slate-500 dark:text-slate-400"
                            title={r.isActive ? "Pause" : "Resume"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDel(r)}
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Cards / Grid View ───────────────────────────── */
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(r => {
                const brand = getBrand(r.name, r.type);
                const amt = parseFloat(r.amount);
                const isToggling = togglingId === r.id;
                const freqLower = r.frequency.toLowerCase();
                const monthly = freqLower === "yearly" ? amt / 12 : freqLower === "weekly" ? amt * 4.33 : freqLower === "daily" ? amt * 30 : amt;

                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all border-slate-200/80 hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:hover:border-slate-700/80 ${
                      !r.isActive ? "opacity-55 hover:opacity-85" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-xs ${brand.bg} ${brand.text} ${brand.border}`}>
                          <brand.Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {r.categoryName || "General"} · via {r.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => markAsPaid(r)}
                          disabled={payingId === r.id || !r.isActive}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40 transition cursor-pointer dark:bg-emerald-500/15 dark:text-emerald-400"
                          title="Mark as paid"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{payingId === r.id ? "Paying..." : "Pay"}</span>
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDel(r)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <div>
                        <p className={`text-xl font-black tabular-nums ${
                          r.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"
                        }`}>
                          {r.type === "income" ? "+" : "−"}{formatCurrency(amt, currency)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {r.frequency} (~{formatCurrency(monthly, currency)}/mo)
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          !r.isActive
                            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : r.daysUntil <= 3
                            ? "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                            : "bg-emerald-500/10 text-slate-900 dark:text-emerald-400"
                        }`}>
                          {!r.isActive ? "Paused" : r.daysUntil === 0 ? "Due Today" : `in ${r.daysUntil}d`}
                        </span>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1 tabular-nums">
                          {formatDate(r.nextDue, "DD MMM YYYY")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Subscription Status:</span>
                      <button
                        onClick={() => toggleActive(r)}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          r.isActive
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {r.isActive ? "Active" : "Paused"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ── 5. Add / Edit Modal ──────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Subscription" : "New Subscription"} wide>
        <form onSubmit={save} className="space-y-4">
          {/* Quick Presets */}
          {!editing && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => {
                  const b = getBrand(p.name, p.type);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        name: p.name,
                        amount: p.amount,
                        type: p.type,
                        categoryName: p.categoryName,
                        frequency: p.frequency,
                        paymentMethod: p.paymentMethod
                      })}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-emerald-500/30 hover:text-emerald-500 transition-all cursor-pointer"
                    >
                      <b.Icon className={`h-3 w-3 ${b.text}`} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                  form.type === t
                    ? t === "expense"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {t === "expense" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                {t === "expense" ? "Expense / Bill" : "Income / Salary"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Subscription Name">
                <input
                  className={inputCls}
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Netflix, Spotify, Rent, Jio Fiber..."
                />
              </Field>
            </div>

            <Field label="Amount">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="1"
                required
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="149"
              />
            </Field>

            <Field label="Billing Frequency">
              <select
                className={inputCls}
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>

            {formMonthly > 0 && (
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Effective monthly cost:</span>
                <span className="font-extrabold text-slate-900 dark:text-emerald-400 tabular-nums">
                  ~{formatCurrency(formMonthly, currency)} / mo
                </span>
              </div>
            )}

            <Field label="Category">
              <input
                className={inputCls}
                value={form.categoryName}
                onChange={e => setForm({ ...form, categoryName: e.target.value })}
                placeholder="Entertainment, Bills, Utilities..."
              />
            </Field>

            <Field label="Payment Method">
              <select
                className={inputCls}
                value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Start / Next Due Date">
              <input
                className={inputCls}
                type="date"
                required
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>

            <Field label="End Date (Optional)">
              <input
                className={inputCls}
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create Subscription"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        title="Delete Subscription?"
        message={`Remove "${del?.name}"? Recurring tracking will stop.`}
      />
    </AppShell>
  );
}
