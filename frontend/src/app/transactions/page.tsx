"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Search, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, X,
  Download, FileText, ArrowDownLeft, ArrowUpRight, Wallet, Landmark, Check
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { PAYMENT_METHODS } from "@/lib/constants";

interface Tx {
  id: string;
  type: "income" | "expense" | string;
  amount: string;
  description: string;
  categoryName: string | null;
  categoryId: string | null;
  accountId?: string | null;
  date: string;
  paymentMethod: string;
  notes: string | null;
}

interface Cat {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface AccountOpt {
  id: string;
  name: string;
  type: string;
}

function formatDate(dStr: unknown) {
  if (!dStr) return "—";
  const str = String(dStr);
  const clean = str.includes("T") ? str.split("T")[0] : str;
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2] && !Number.isNaN(parts[0])) {
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  return str;
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="h-7 w-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-3.5 w-64 rounded-lg bg-slate-100 dark:bg-slate-800/60 mt-1.5" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200/80 bg-white p-4.5 dark:border-slate-800/80 dark:bg-[#111827]" />
        ))}
      </div>
      <div className="h-96 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-[#111827]" />
    </div>
  );
}

function TransactionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currency = user?.currency || "INR";

  const initialSearch = searchParams?.get("search") || "";
  const initialDate = searchParams?.get("date") || "";

  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [typeF, setTypeF] = useState("");
  const [catF, setCatF] = useState("");
  const [accountF, setAccountF] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, net: 0 });

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [del, setDel] = useState<Tx | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const [form, setForm] = useState({
    type: "expense" as "expense" | "income",
    amount: "",
    description: "",
    categoryId: "",
    categoryName: "",
    accountId: "",
    date: getTodayString(),
    paymentMethod: "UPI",
    notes: "",
  });

  const [exportingCsv, setExportingCsv] = useState(false);

  const exportCsv = async () => {
    try {
      setExportingCsv(true);
      const q = new URLSearchParams({
        page: "1",
        limit: "10000",
        sortBy,
        sortDir,
      });
      if (search.trim()) q.set("search", search.trim());
      if (typeF) q.set("type", typeF);
      if (catF) q.set("category", catF);
      if (accountF) q.set("accountId", accountF);
      if (initialDate) q.set("date", initialDate);

      const res = await fetch(`/api/transactions?${q}`, { credentials: "include" });
      const json = await res.json();
      const exportList: Tx[] = json.success && Array.isArray(json.data?.transactions) ? json.data.transactions : txs;

      if (exportList.length === 0) {
        toast("No transactions to export", "error");
        return;
      }
      const headers = ["Date", "Description", "Type", `Amount (${currency})`, "Category", "Account", "Payment Method", "Notes"];
      const rows = exportList.map((t) => {
        const acc = accounts.find((a) => a.id === t.accountId);
        return [
          `"${t.date}"`,
          `"${(t.description || "").replace(/"/g, '""')}"`,
          `"${t.type}"`,
          `"${t.amount}"`,
          `"${t.categoryName || ""}"`,
          `"${acc?.name || ""}"`,
          `"${t.paymentMethod || ""}"`,
          `"${(t.notes || "").replace(/"/g, '""')}"`,
        ];
      });
      const csvString = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `FinTrack_Transactions_${getTodayString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast(`Exported ${exportList.length} transactions to CSV 📊`);
    } catch {
      toast("Failed to export CSV", "error");
    } finally {
      setExportingCsv(false);
    }
  };

  const exportPdf = () => {
    window.print();
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy,
        sortDir,
      });
      if (search.trim()) q.set("search", search.trim());
      if (typeF) q.set("type", typeF);
      if (catF) q.set("category", catF);
      if (accountF) q.set("accountId", accountF);
      if (initialDate) q.set("date", initialDate);

      const res = await fetch(`/api/transactions?${q}`, { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data) {
        setTxs(json.data.transactions || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        if (json.data.summary) {
          setSummary(json.data.summary);
        }
      } else {
        toast(json.message || "Failed to load transactions", "error");
      }
    } catch {
      toast("Network error loading transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, search, typeF, catF, accountF, initialDate]);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && Array.isArray(j.data?.categories) && setCats(j.data.categories))
      .catch(() => {});

    fetch("/api/accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && Array.isArray(j.data?.accounts) && setAccounts(j.data.accounts))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      type: "expense",
      amount: "",
      description: "",
      categoryId: "",
      categoryName: "",
      accountId: accounts[0]?.id || "",
      date: getTodayString(),
      paymentMethod: "UPI",
      notes: "",
    });
    setModal(true);
  };

  const openEdit = (t: Tx) => {
    setEditing(t);
    const dateStr = t.date ? String(t.date).slice(0, 10) : getTodayString();
    setForm({
      type: t.type === "income" ? "income" : "expense",
      amount: t.amount,
      description: t.description,
      categoryId: t.categoryId || "",
      categoryName: t.categoryName || "",
      accountId: t.accountId || "",
      date: dateStr,
      paymentMethod: t.paymentMethod || "UPI",
      notes: t.notes || "",
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amount: form.amount,
        description: form.description,
        categoryId: form.categoryId || undefined,
        category: form.categoryName || undefined,
        categoryName: form.categoryName || undefined,
        accountId: form.accountId || undefined,
        date: form.date,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      };

      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to save transaction");
      toast(editing ? "Transaction updated" : "Transaction added");
      setModal(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save transaction", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      const res = await fetch(`/api/transactions/${del.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to delete transaction");
      toast("Transaction deleted");
      setDel(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete transaction", "error");
    }
  };

  const isAllSelected = txs.length > 0 && txs.every((t) => selectedIds.includes(t.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(txs.map((t) => t.id));
    }
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/transactions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to delete transactions");
      toast(`Successfully deleted ${json.data?.deletedCount ?? selectedIds.length} transactions!`);
      setSelectedIds([]);
      setBulkConfirm(false);
      load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Bulk delete failed", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const catsForType = cats.filter((c) => c.type === form.type);
  const hasActiveFilters = Boolean(search || typeF || catF || accountF || initialDate);

  const resetFilters = () => {
    setSearch("");
    setTypeF("");
    setCatF("");
    setAccountF("");
    setPage(1);
    if (initialDate && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/transactions");
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and audit every transaction in and out of your financial accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportPdf} className="h-9 px-3 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
          <Button variant="outline" onClick={exportCsv} loading={exportingCsv} className="h-9 px-3 text-xs font-semibold cursor-pointer">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
          <Button onClick={openAdd} className="h-9 px-3.5 text-xs font-bold shadow-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* ── 2. Metric Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Inflow */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Inflow
            </span>
            <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatCurrency(summary.income, currency)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Incoming credits & deposits</p>
          </div>
        </div>

        {/* Outflow */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outflow
            </span>
            <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400 tracking-tight tabular-nums">
              {formatCurrency(summary.expenses, currency)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Expenses, bills & withdrawals</p>
          </div>
        </div>

        {/* Net Cash */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Balance
            </span>
            <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p
              className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                summary.net >= 0 ? "text-slate-900 dark:text-white" : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {formatCurrency(summary.net, currency)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Net overall cash balance</p>
          </div>
        </div>
      </div>

      {/* ── 3. Table & Filters Card ──────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] dark:border-slate-800/80 dark:bg-[#111827] dark:shadow-none overflow-hidden">
        {/* Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-72 lg:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search description, notes, method..."
              className="w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:bg-[#0b0f19] shadow-2xs"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Pills & Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Segment Control */}
            <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-800/80 text-xs font-semibold">
              {[
                { label: "All", value: "" },
                { label: "+ Income", value: "income" },
                { label: "− Expense", value: "expense" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setTypeF(f.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition cursor-pointer text-xs font-bold ${
                    typeF === f.value
                      ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-indigo-600 dark:text-white dark:ring-0"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category Select */}
            <select
              value={catF}
              onChange={(e) => {
                setCatF(e.target.value);
                setPage(1);
              }}
              className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              <option value="">All Categories</option>
              {[...new Set(cats.map((c) => c.name))].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            {/* Account Select */}
            {accounts.length > 0 && (
              <select
                value={accountF}
                onChange={(e) => {
                  setAccountF(e.target.value);
                  setPage(1);
                }}
                className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Select */}
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [a, b] = e.target.value.split("-");
                setSortBy(a);
                setSortDir(b);
              }}
              className="h-8.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High → Low</option>
              <option value="amount-asc">Amount: Low → High</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 h-8.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer transition"
                title="Clear filters"
              >
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div>
          {loading ? (
            <div className="p-5 space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
              ))}
            </div>
          ) : txs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ArrowLeftRight className="h-7 w-7" />}
                title={hasActiveFilters ? "No matching transactions." : "No transactions yet."}
                message={
                  hasActiveFilters
                    ? "Try adjusting your search keywords or resetting active filters."
                    : "Add your first income credit or expense payment to start tracking your cash flow."
                }
                action={
                  <Button onClick={openAdd} className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Transaction
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800/80 dark:bg-slate-800/30 dark:text-slate-400">
                      <th className="w-10 px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all transactions"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer accent-indigo-600"
                        />
                      </th>
                      <th className="px-5 py-3.5">Transaction</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Account / Wallet</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Payment Method</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {txs.map((t) => {
                      const acc = accounts.find((a) => a.id === t.accountId);
                      const isInc = t.type === "income";
                      const isSelected = selectedIds.includes(t.id);
                      const amtNum = parseFloat(t.amount || "0");

                      return (
                        <tr
                          key={t.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-indigo-50/60 dark:bg-indigo-950/20"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="w-10 px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(t.id)}
                              aria-label={`Select transaction ${t.description}`}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer accent-indigo-600"
                            />
                          </td>

                          {/* Description */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                                  isInc
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20"
                                }`}
                              >
                                {isInc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate text-sm leading-snug">
                                  {t.description}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                                  {t.notes || (isInc ? "Incoming credit" : "Outgoing payment")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isInc ? "bg-emerald-500" : "bg-indigo-500"
                                }`}
                              />
                              {t.categoryName || "Uncategorized"}
                            </span>
                          </td>

                          {/* Account */}
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {acc ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <Landmark className="h-3 w-3 text-slate-400" />
                                {acc.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(t.date)}
                          </td>

                          {/* Payment Method */}
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {t.paymentMethod || "UPI"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td
                            className={`px-5 py-3.5 text-right font-black text-sm whitespace-nowrap tabular-nums ${
                              isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isInc ? "+" : "−"}
                            {formatCurrency(amtNum, currency)}
                          </td>

                          {/* Actions */}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-2.5 p-3.5 md:hidden">
                {txs.map((t) => {
                  const isInc = t.type === "income";
                  const amtNum = parseFloat(t.amount || "0");
                  const acc = accounts.find((a) => a.id === t.accountId);

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-slate-200/80 p-3.5 dark:border-slate-800 bg-white dark:bg-[#111827]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${
                              isInc
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20"
                            }`}
                          >
                            {isInc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {t.description}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {formatDate(t.date)} · {t.categoryName || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-black tabular-nums shrink-0 ${
                            isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInc ? "+" : "−"}
                          {formatCurrency(amtNum, currency)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-xs text-slate-500">
                        <span className="truncate">
                          {acc ? `${acc.name} · ` : ""}
                          {t.paymentMethod || "UPI"}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDel(t)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-500/10 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="p-3.5 sm:px-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-900 dark:text-white">{txs.length}</span>{" "}
                  transaction{txs.length === 1 ? "" : "s"} · Page{" "}
                  <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{" "}
                  <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
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

      {/* ── 4. Add / Edit Transaction Modal ──────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Transaction" : "Add Transaction"} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {/* Income / Expense Switcher */}
          <div className="sm:col-span-2 flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "expense", categoryId: "", categoryName: "" })}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition cursor-pointer ${
                form.type === "expense"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "income", categoryId: "", categoryName: "" })}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition cursor-pointer ${
                form.type === "income"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <Field label={`Amount (${CURRENCY_SYMBOLS[currency] || currency})`}>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="500"
              autoFocus
            />
          </Field>

          {/* Date */}
          <Field label="Date">
            <input
              className={inputCls}
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          {/* Description */}
          <div className="sm:col-span-2">
            <Field label="Description">
              <input
                className={inputCls}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Swiggy dinner, Grocery, Freelance project"
              />
            </Field>
          </div>

          {/* Category */}
          <Field label="Category">
            <select
              className={inputCls}
              value={form.categoryId}
              onChange={(e) => {
                const c = cats.find((x) => x.id === e.target.value);
                setForm({
                  ...form,
                  categoryId: e.target.value,
                  categoryName: c?.name || "",
                });
              }}
            >
              <option value="">Select category</option>
              {catsForType.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Account / Wallet */}
          <Field label="Account / Wallet (optional)">
            <select
              className={inputCls}
              value={form.accountId || ""}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              <option value="">None / Cash</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </Field>

          {/* Payment Method */}
          <Field label="Payment Method">
            <select
              className={inputCls}
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          {/* Notes */}
          <div className="sm:col-span-2">
            <Field label="Notes (optional)">
              <textarea
                className={inputCls}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any memo or additional transaction notes…"
              />
            </Field>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Add Transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── 5. Delete Confirm Dialog ─────────────────────────────── */}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        title="Delete transaction?"
        message={`Delete "${del?.description}"? This action cannot be undone.`}
      />

      {/* ── 6. Bulk Delete Confirm Dialog ─────────────────────────── */}
      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Transactions?`}
        message={`This will permanently remove ${selectedIds.length} selected transactions and restore their account balances. This action cannot be undone.`}
        confirmText={bulkDeleting ? "Deleting..." : `Delete ${selectedIds.length} Transactions`}
        danger
      />

      {/* ── 7. Floating Glassmorphic Bulk Toolbar ─────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/60 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-black text-white">
              {selectedIds.length}
            </span>
            selected
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
          >
            Deselect
          </button>
          <button
            onClick={() => setBulkConfirm(true)}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{bulkDeleting ? "Deleting..." : "Delete Selected"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsContent />
      </Suspense>
    </AppShell>
  );
}
