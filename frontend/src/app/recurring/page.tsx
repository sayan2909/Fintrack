"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Repeat, Pencil, Trash2, CalendarClock, Power, Search,
  LayoutGrid, List, ArrowUpRight, ArrowDownLeft, Activity,
  Film, Music, Play, Wifi, Home, Briefcase, TrendingUp, Zap,
  CreditCard, Layers, Sparkles, CheckCircle2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, EmptyState, ConfirmDialog, toast } from "@/components/ui";
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

function getBrand(name: string, type: string) {
  const n = name.toLowerCase();
  if (type === "income") return { Icon: Briefcase, color: "#10b981", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (n.includes("youtube")) return { Icon: Play, color: "#ef4444", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" };
  if (n.includes("netflix") || n.includes("hotstar") || n.includes("disney") || n.includes("prime")) return { Icon: Film, color: "#f43f5e", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/20" };
  if (n.includes("spotify") || n.includes("music")) return { Icon: Music, color: "#10b981", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (n.includes("rent") || n.includes("house") || n.includes("flat")) return { Icon: Home, color: "#f59e0b", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" };
  if (n.includes("broadband") || n.includes("wifi") || n.includes("internet") || n.includes("jio") || n.includes("airtel")) return { Icon: Wifi, color: "#0ea5e9", bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/20" };
  if (n.includes("sip") || n.includes("invest") || n.includes("mutual") || n.includes("zerodha") || n.includes("groww")) return { Icon: TrendingUp, color: "#8b5cf6", bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/20" };
  if (n.includes("bill") || n.includes("electric") || n.includes("gas") || n.includes("utility")) return { Icon: Zap, color: "#eab308", bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/20" };
  return { Icon: Repeat, color: "#6366f1", bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/20" };
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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [form, setForm] = useState({ name: "", amount: "", type: "expense", categoryName: "", frequency: "Monthly", startDate: new Date().toISOString().slice(0, 10), endDate: "", paymentMethod: "Bank Transfer" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring", { credentials: "include" });
      const json = await res.json();
      if (json.success) { setItems(json.data.recurring); setSummary(json.data.summary); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", amount: "", type: "expense", categoryName: "", frequency: "Monthly", startDate: new Date().toISOString().slice(0, 10), endDate: "", paymentMethod: "Bank Transfer" }); setModal(true); };
  const openEdit = (r: Rec) => { setEditing(r); setForm({ name: r.name, amount: r.amount, type: r.type, categoryName: r.categoryName || "", frequency: r.frequency, startDate: r.startDate, endDate: r.endDate || "", paymentMethod: r.paymentMethod }); setModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editing ? `/api/recurring/${editing.id}` : "/api/recurring";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...form, endDate: form.endDate || undefined }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Updated" : "Created successfully"); setModal(false); load();
    } catch (e2: unknown) { toast(e2 instanceof Error ? e2.message : "Failed", "error"); } finally { setSaving(false); }
  };

  const toggleActive = async (r: Rec) => {
    setTogglingId(r.id);
    try {
      const res = await fetch(`/api/recurring/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ isActive: !r.isActive }) });
      const json = await res.json();
      if (json.success) { toast(r.isActive ? "Paused" : "Resumed"); load(); }
    } finally { setTogglingId(null); }
  };

  const doDelete = async () => {
    if (!del) return;
    const res = await fetch(`/api/recurring/${del.id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (json.success) { toast("Deleted"); setDel(null); load(); } else toast(json.message, "error");
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
    exp.forEach(i => { const k = i.categoryName || "Other"; map[k] = (map[k] || 0) + parseFloat(i.amount); });
    return Object.entries(map).map(([name, amt]) => ({ name, amount: amt, pct: Math.round((amt / total) * 100) })).sort((a, b) => b.amount - a.amount);
  }, [items]);

  const formMonthly = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const f = form.frequency.toLowerCase();
    if (f === "daily") return amt * 30;
    if (f === "weekly") return amt * 4.33;
    if (f === "yearly") return amt / 12;
    return amt;
  }, [form.amount, form.frequency]);

  const filtered = useMemo(() => items.filter(r => {
    if (statusFilter === "active" && !r.isActive) return false;
    if (statusFilter === "paused" && r.isActive) return false;
    if (statusFilter === "duesoon" && (!r.isActive || r.daysUntil > 7)) return false;
    if (freqFilter !== "all" && r.frequency.toLowerCase() !== freqFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.categoryName || "").toLowerCase().includes(q) || r.paymentMethod.toLowerCase().includes(q);
    }
    return true;
  }), [items, statusFilter, freqFilter, searchQuery]);

  return (
    <AppShell>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Recurring Hub</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Subscriptions & Bills
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage automated commitments, renewal cycles, and recurring cash flow.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {(["table", "grid"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${viewMode === v ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
                {v === "table" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                <span className="capitalize">{v === "table" ? "Ledger" : "Cards"}</span>
              </button>
            ))}
          </div>
          <Button onClick={openAdd} className="h-9 px-4 text-xs font-bold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add New
          </Button>
        </div>
      </div>

      {/* ── 4 KPI Cards ─────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-4 gap-4">

        <Card className="p-5 dark:bg-[#111827] dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Out</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(summary.monthlyOut, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(projectedAnnual, currency)}/yr projected
          </p>
        </Card>

        <Card className="p-5 dark:bg-[#111827] dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recurring In</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(summary.monthlyIn, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Salaries &amp; periodic income</p>
        </Card>

        <Card className="p-5 dark:bg-[#111827] dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Delta</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${netMonthly >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <p className={`text-2xl font-black tracking-tight tabular-nums ${netMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
            {formatCurrency(netMonthly, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {netMonthly >= 0 ? "Positive surplus" : "Committed net burn"}
          </p>
        </Card>

        <Card className="p-5 dark:bg-[#111827] dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{activeCount}</p>
            <span className="text-sm text-slate-400 font-medium">/ {items.length}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700" style={{ width: `${items.length ? (activeCount / items.length) * 100 : 100}%` }} />
          </div>
        </Card>

      </div>



      {/* ── Main 2-Column Workspace ───────────────────────── */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT: Ledger / Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: `All (${items.length})` },
                { id: "active", label: `Active (${activeCount})` },
                { id: "duesoon", label: `Due Soon (${dueSoon.length})` },
                { id: "paused", label: `Paused (${pausedCount})` },
              ].map(tab => (
                <button key={tab.id} onClick={() => setStatusFilter(tab.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${statusFilter === tab.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 w-40 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer">
                <option value="all">All Cycles</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center dark:bg-[#111827] dark:border-slate-800/80">
              <EmptyState icon={<Repeat className="h-7 w-7 text-indigo-400" />}
                title={items.length === 0 ? "No subscriptions yet" : "No items match filters"}
                message={items.length === 0 ? "Add Netflix, rent, SIPs, or any recurring obligation." : "Try clearing filters or changing the date selection."}
                action={items.length === 0 ? <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add first item</Button> : <Button variant="outline" onClick={() => { setStatusFilter("all"); setFreqFilter("all"); setSearchQuery(""); }}>Clear Filters</Button>}
              />
            </Card>
          ) : viewMode === "table" ? (
            <Card className="overflow-hidden p-0 dark:bg-[#111827] dark:border-slate-800/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/70">
                      {["Subscription", "Category", "Cycle", "Next Renewal", "Cost / mo", "Status", ""].map(h => (
                        <th key={h} className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${h === "Cost / mo" ? "text-right" : h === "Status" ? "text-center" : ""}`}>{h}</th>
                      ))}
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
                        <tr key={r.id} className={`group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${!r.isActive ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${brand.bg} ${brand.text} ${brand.border}`}>
                                <brand.Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{r.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">via {r.paymentMethod}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                              {r.categoryName || "General"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{r.frequency}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-white">{formatDate(r.nextDue, "DD MMM YYYY")}</span>
                              {r.isActive && (
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.daysUntil === 0 ? "bg-rose-500/15 text-rose-400" : r.daysUntil <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                                  {r.daysUntil === 0 ? "Today" : `in ${r.daysUntil}d`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`text-sm font-black tabular-nums ${r.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"}`}>
                              {r.type === "income" ? "+" : "−"}{formatCurrency(monthly, currency)}
                            </span>
                            {r.frequency !== "Monthly" && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{r.frequency.toLowerCase()} {formatCurrency(amt, currency)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button onClick={() => toggleActive(r)} disabled={isToggling}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${r.isActive ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                              {r.isActive ? "Active" : "Paused"}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setDel(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map(r => {
                const brand = getBrand(r.name, r.type);
                const amt = parseFloat(r.amount);
                return (
                  <Card key={r.id} className={`p-5 dark:bg-[#111827] dark:border-slate-800/80 hover:border-slate-700 hover:shadow-md transition-all group ${!r.isActive ? "opacity-55" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${brand.bg} ${brand.text} ${brand.border}`}><brand.Icon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{r.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{r.categoryName || "General"} · {r.frequency}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => toggleActive(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><Power className={`h-3.5 w-3.5 ${r.isActive ? "text-emerald-400" : ""}`} /></button>
                        <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDel(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <div>
                        <p className={`text-xl font-black tabular-nums ${r.type === "income" ? "text-emerald-500" : "text-slate-900 dark:text-white"}`}>{r.type === "income" ? "+" : "−"}{formatCurrency(amt, currency)}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">via {r.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${!r.isActive ? "bg-slate-800 text-slate-400" : r.daysUntil <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-300"}`}>
                          {!r.isActive ? "Paused" : r.daysUntil === 0 ? "Due Today" : `in ${r.daysUntil}d`}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">{formatDate(r.nextDue, "DD MMM YYYY")}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">

          {/* Next Auto-Debit – Clean Premium Card (no ticket gimmick) */}
          {nextUp ? (() => {
            const brand = getBrand(nextUp.name, nextUp.type);
            const isUrgent = nextUp.daysUntil <= 3;
            return (
              <div className={`rounded-2xl border p-5 ${isUrgent ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10" : "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#111827]"} shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Auto-Debit</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${nextUp.daysUntil === 0 ? "bg-rose-500/15 text-rose-400" : nextUp.daysUntil <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {nextUp.daysUntil === 0 ? "Due Today" : nextUp.daysUntil === 1 ? "Tomorrow" : `In ${nextUp.daysUntil} days`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${brand.bg} ${brand.text} ${brand.border}`}>
                    <brand.Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white text-base">{nextUp.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{nextUp.categoryName || "Subscription"} · {nextUp.frequency}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Amount Due</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{formatCurrency(parseFloat(nextUp.amount), currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-400">Renewal Date</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{formatDate(nextUp.nextDue, "DD MMM YYYY")}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">via {nextUp.paymentMethod}</p>
                  </div>
                </div>

                <button onClick={() => toggleActive(nextUp)}
                  className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${nextUp.isActive ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`}>
                  <Power className="h-3.5 w-3.5" />
                  <span>{nextUp.isActive ? "Pause This Subscription" : "Resume Subscription"}</span>
                </button>
              </div>
            );
          })() : (
            <Card className="p-5 text-center dark:bg-[#111827] dark:border-slate-800/80">
              <CalendarClock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No upcoming debits</p>
            </Card>
          )}

          {/* Category Breakdown */}
          {catBreakdown.length > 0 && (
            <Card className="p-5 dark:bg-[#111827] dark:border-slate-800/80">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-indigo-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Spend by Category</p>
              </div>
              <div className="space-y-3.5">
                {catBreakdown.map(cat => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{cat.name}</span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(cat.amount, currency)} <span className="font-normal text-slate-400">({cat.pct}%)</span></span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500" style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Annual Burn Projection */}
          <Card className="p-5 border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/5 dark:border-indigo-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Annual Commitment</p>
                <p className="mt-1 text-2xl font-black text-indigo-500 dark:text-indigo-400 tabular-nums">{formatCurrency(projectedAnnual, currency)}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Projected yearly outflow from active subscriptions. Pause what you don&apos;t use to redirect to your savings goals.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────── */}
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
                    <button key={p.name} type="button"
                      onClick={() => setForm({ ...form, name: p.name, amount: p.amount, type: p.type, categoryName: p.categoryName, frequency: p.frequency, paymentMethod: p.paymentMethod })}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-indigo-500/60 hover:text-white transition-all cursor-pointer">
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
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${form.type === t ? t === "expense" ? "bg-rose-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
                {t === "expense" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                {t === "expense" ? "Expense / Bill" : "Income / Salary"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name"><input className={inputCls} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix, Rent, Jio Fiber..." /></Field>
            </div>
            <Field label="Amount (₹)"><input className={inputCls} type="number" step="0.01" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="149" /></Field>
            <Field label="Frequency"><select className={inputCls} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>{FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}</select></Field>
            {formMonthly > 0 && (
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2.5 text-xs">
                <span className="text-slate-400">Effective monthly cost:</span>
                <span className="font-extrabold text-indigo-400 tabular-nums">~{formatCurrency(formMonthly, currency)} / mo</span>
              </div>
            )}
            <Field label="Category"><input className={inputCls} value={form.categoryName} onChange={e => setForm({ ...form, categoryName: e.target.value })} placeholder="Entertainment, Bills, Rent..." /></Field>
            <Field label="Payment Method"><select className={inputCls} value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></Field>
            <Field label="Start / Next Due"><input className={inputCls} type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="End Date (Optional)"><input className={inputCls} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create Subscription"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete Subscription?" message={`Remove "${del?.name}"? Recurring tracking will stop.`} />
    </AppShell>
  );
}
