"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Plus, Search, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, X,
  Download, FileText, ArrowDownLeft, ArrowUpRight, Wallet, Filter
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, Badge, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { PAYMENT_METHODS } from "@/lib/constants";

interface Tx {
  id: string; type: string; amount: string; description: string; categoryName: string | null;
  categoryId: string | null; accountId?: string | null; date: string; paymentMethod: string; notes: string | null;
}
interface Cat { id: string; name: string; type: string; color: string }
interface AccountOpt { id: string; name: string; type: string }

function formatDate(dStr: string) {
  if (!dStr) return "—";
  const [y, m, d] = dStr.split("-").map(Number);
  if (!y || !m || !d) return dStr;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currency = user?.currency || "INR";
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeF, setTypeF] = useState("");
  const [catF, setCatF] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, net: 0 });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [del, setDel] = useState<Tx | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "expense", amount: "", description: "", categoryId: "", categoryName: "", accountId: "", date: new Date().toISOString().slice(0, 10), paymentMethod: "UPI", notes: "" });

  const exportCsv = () => {
    if (txs.length === 0) {
      toast("No transactions to export", "error");
      return;
    }
    const headers = ["Date", "Description", "Type", "Amount (INR)", "Category", "Payment Method", "Notes"];
    const rows = txs.map((t) => [
      `"${t.date}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.amount}"`,
      `"${t.categoryName || ''}"`,
      `"${t.paymentMethod || ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvString = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FinTrack_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("CSV exported successfully");
  };

  const exportPdf = () => {
    window.print();
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "10", sortBy, sortDir });
      if (search) q.set("search", search);
      if (typeF) q.set("type", typeF);
      if (catF) q.set("category", catF);
      const res = await fetch(`/api/transactions?${q}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setTxs(json.data.transactions);
        setTotalPages(json.data.pagination.totalPages);
        setSummary(json.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, search, typeF, catF]);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" }).then((r) => r.json()).then((j) => j.success && setCats(j.data.categories));
    fetch("/api/accounts", { credentials: "include" }).then((r) => r.json()).then((j) => j.success && Array.isArray(j.data?.accounts) && setAccounts(j.data.accounts));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ type: "expense", amount: "", description: "", categoryId: "", categoryName: "", accountId: accounts[0]?.id || "", date: new Date().toISOString().slice(0, 10), paymentMethod: "UPI", notes: "" });
    setModal(true);
  };
  const openEdit = (t: Tx) => {
    setEditing(t);
    setForm({ type: t.type, amount: t.amount, description: t.description, categoryId: t.categoryId || "", categoryName: t.categoryName || "", accountId: t.accountId || "", date: t.date, paymentMethod: t.paymentMethod, notes: t.notes || "" });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, category: form.categoryName || undefined, accountId: form.accountId || undefined };
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Transaction updated" : "Transaction added");
      setModal(false);
      load();
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      const res = await fetch(`/api/transactions/${del.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast("Transaction deleted");
      setDel(null);
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const catsForType = cats.filter((c) => c.type === form.type);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track and audit every rupee in and out of your accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportPdf} className="h-9 px-3 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
          <Button variant="outline" onClick={exportCsv} className="h-9 px-3 text-xs font-semibold">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
          <Button onClick={openAdd} className="h-9 px-3.5 text-xs font-bold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Transaction
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Inflow</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatCurrency(summary.income, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Incoming credits & deposits</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Outflow</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
              {formatCurrency(summary.expenses, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Expenses, bills & withdrawals</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Balance</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${summary.net >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400"}`}>
              {formatCurrency(summary.net, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Net period cash flow</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-[#111827] overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-72 lg:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search description, notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-[#0b0f19]"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/80 text-xs font-semibold">
              {[
                { label: "All", value: "" },
                { label: "+ Income", value: "income" },
                { label: "− Expense", value: "expense" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => { setTypeF(f.value); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 transition cursor-pointer text-xs font-bold ${
                    typeF === f.value
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={catF}
              onChange={(e) => { setCatF(e.target.value); setPage(1); }}
              className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs text-slate-700 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer"
            >
              <option value="">All Categories</option>
              {[...new Set(cats.map((c) => c.name))].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => { const [a, b] = e.target.value.split("-"); setSortBy(a); setSortDir(b); }}
              className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs text-slate-700 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High → Low</option>
              <option value="amount-asc">Amount: Low → High</option>
            </select>
            {(search || typeF || catF) && (
              <button
                onClick={() => { setSearch(""); setTypeF(""); setCatF(""); setPage(1); }}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 h-8.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer transition"
                title="Clear filters"
              >
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>
        <div>
          {loading ? (
            <div className="p-5 space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : txs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ArrowLeftRight className="h-7 w-7" />}
                title="No transactions found."
                message="No transactions match your current search criteria or filters."
                action={<Button onClick={openAdd} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add Transaction</Button>}
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800/80 dark:bg-slate-800/30 dark:text-slate-400">
                      <th className="px-5 py-3.5">Transaction</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Payment Method</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {txs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                              t.type === "income"
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20"
                            }`}>
                              {t.type === "income" ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate text-sm leading-snug">
                                {t.description}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                                {t.notes || (t.type === "income" ? "Incoming credit" : "Outgoing expense")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            {t.categoryName || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {t.paymentMethod || "UPI"}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-right font-black text-sm whitespace-nowrap tabular-nums ${
                          t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {t.type === "income" ? "+" : "−"}{formatCurrency(parseFloat(t.amount), currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(t)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 cursor-pointer transition"
                              title="Edit Transaction"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDel(t)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer transition"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 p-3.5 md:hidden">
                {txs.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200/80 p-3.5 dark:border-slate-800 bg-white dark:bg-[#111827]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${
                          t.type === "income"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20"
                        }`}>
                          {t.type === "income" ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.description}</p>
                      </div>
                      <span className={`text-sm font-black tabular-nums ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {t.type === "income" ? "+" : "−"}{formatCurrency(parseFloat(t.amount), currency)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">{t.categoryName || "Uncategorized"} · {formatDate(t.date)} · {t.paymentMethod}</p>
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => openEdit(t)} className="flex-1 rounded-xl bg-slate-100 py-1.5 text-xs font-bold dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">Edit</button>
                      <button onClick={() => setDel(t)} className="flex-1 rounded-xl bg-rose-50 py-1.5 text-xs font-bold text-rose-600 dark:bg-rose-500/10 cursor-pointer">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3.5 sm:px-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-900 dark:text-white">{txs.length}</span> transaction{txs.length === 1 ? "" : "s"} · Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs font-medium"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs font-medium"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Transaction" : "Add Transaction"} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {(["expense", "income"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t, categoryId: "", categoryName: "" })} className={`flex-1 rounded-xl py-2 text-sm font-bold capitalize transition ${form.type === t ? (t === "income" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <Field label="Amount (₹)"><input className={inputCls} type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500" /></Field>
          <Field label="Date"><input className={inputCls} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><input className={inputCls} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Swiggy dinner" /></Field></div>
          <Field label="Category">
            <select className={inputCls} value={form.categoryId} onChange={(e) => { const c = cats.find((x) => x.id === e.target.value); setForm({ ...form, categoryId: e.target.value, categoryName: c?.name || "" }); }}>
              <option value="">Select category</option>
              {catsForType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Account / Wallet (optional)">
            <select className={inputCls} value={form.accountId || ""} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Default Account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </Field>
          <Field label="Payment Method">
            <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details…" /></Field></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Add Transaction"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete transaction?" message={`Delete "${del?.description}"? This cannot be undone.`} />
    </AppShell>
  );
}

export default function TransactionsPage() {
  return <Suspense><PageInner /></Suspense>;
}
