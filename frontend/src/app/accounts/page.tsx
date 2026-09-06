"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Wallet,
  CreditCard,
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Shield,
  Coins,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge, inputCls, toast, ConfirmDialog } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

export interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: string;
  accountNumber?: string | null;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

const ACCOUNT_TYPES = [
  { label: "Bank Account", icon: Building2 },
  { label: "Credit Card", icon: CreditCard },
  { label: "Cash", icon: Coins },
  { label: "Digital Wallet", icon: Wallet },
  { label: "Investment", icon: TrendingUp },
];

const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#0ea5e9", // Sky
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#64748b", // Slate
];

export default function AccountsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<{ id: string; name: string; isDefault: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: "",
    type: "Bank Account",
    balance: "",
    accountNumber: "",
    color: "#6366f1",
    isDefault: false,
  });

  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts", { credentials: "include" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.accounts)) {
        setAccounts(json.data.accounts);
      }
    } catch {
      toast("Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Calculations
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of accounts) {
      const bal = Number(acc.balance);
      if (acc.type === "Credit Card") {
        totalLiabilities += Math.abs(bal);
      } else {
        if (bal >= 0) totalAssets += bal;
        else totalLiabilities += Math.abs(bal);
      }
    }

    return {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      accountCount: accounts.length,
    };
  }, [accounts]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setForm({
      name: "",
      type: "Bank Account",
      balance: "0",
      accountNumber: "",
      color: "#6366f1",
      isDefault: accounts.length === 0,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (acc: AccountItem) => {
    setEditingAccount(acc);
    setForm({
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      accountNumber: acc.accountNumber || "",
      color: acc.color,
      isDefault: acc.isDefault,
    });
    setShowAddModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Please provide an account name", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        // Update
        const res = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast("Account updated successfully");
      } else {
        // Create
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast("Account created successfully");
      }
      setShowAddModal(false);
      loadAccounts();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to save account", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = (id: string, name: string, isDefault: boolean) => {
    setDeletingAccount({ id, name, isDefault });
  };

  const confirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${deletingAccount.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast("Account deleted successfully");
      setDeletingAccount(null);
      await loadAccounts();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete account", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromAccountId || !transferForm.toAccountId) {
      toast("Select both accounts for transfer", "error");
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      toast("From and To accounts cannot be the same", "error");
      return;
    }
    if (!transferForm.amount || Number(transferForm.amount) <= 0) {
      toast("Please enter a valid transfer amount", "error");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(transferForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast("Funds transferred successfully");
      setShowTransferModal(false);
      setTransferForm({
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
      });
      loadAccounts();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to transfer funds", "error");
    } finally {
      setTransferring(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "Credit Card":
        return CreditCard;
      case "Cash":
        return Coins;
      case "Digital Wallet":
        return Wallet;
      case "Investment":
        return TrendingUp;
      default:
        return Building2;
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Multiple Accounts & Wallets
            </h1>
            <p className="text-sm text-slate-500">
              Track bank balances, credit card debt, cash wallets, and transfer funds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (accounts.length < 2) {
                  toast("You need at least 2 accounts to make a transfer", "error");
                  return;
                }
                setTransferForm((prev) => ({
                  ...prev,
                  fromAccountId: accounts[0]?.id || "",
                  toAccountId: accounts[1]?.id || "",
                }));
                setShowTransferModal(true);
              }}
              className="h-9 px-3 text-xs"
            >
              <ArrowRightLeft className="h-4 w-4" /> Transfer
            </Button>
            <Button onClick={handleOpenAdd} className="h-9 px-3 text-xs">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        </div>

        {/* Net Worth & Assets Hero Overview */}
        <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Prominent Net Worth */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 ring-2 ring-indigo-500/20">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Net Worth</span>
                  <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                    {stats.accountCount} {stats.accountCount === 1 ? "Account" : "Accounts"}
                  </span>
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {formatCurrency(stats.netWorth, currency)}
                </p>
              </div>
            </div>

            {/* Right: Liquid Assets vs Liabilities breakdown with clean divider */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800/80 pt-4 lg:pt-0 lg:pl-10">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Liquid Assets</span>
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(stats.totalAssets, currency)}
                </p>
                <span className="text-[11px] text-slate-400">Cash, savings & wallets</span>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Total Liabilities</span>
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCurrency(stats.totalLiabilities, currency)}
                </p>
                <span className="text-[11px] text-slate-400">Credit cards & debt dues</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Bank Cards & Wallets</h2>
            <p className="text-xs text-slate-500">Manage balances, transfer funds, or inspect card transaction history.</p>
          </div>
        </div>

        {/* Accounts Virtual Cards Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-3xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            ))
          ) : accounts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              No accounts created yet. Click &quot;Add Account&quot; to get started!
            </div>
          ) : (
            <>
              {accounts.map((acc) => {
                const IconComp = getAccountIcon(acc.type);
                const balNum = Number(acc.balance);
                const isNegative = balNum < 0;

                return (
                  <div
                    key={acc.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${acc.color || "#4f46e5"}dd 0%, #0f172a 100%)`,
                      border: `1px solid ${acc.color || "#6366f1"}40`,
                    }}
                  >
                    {/* Decorative ambient glow */}
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-35 blur-2xl"
                      style={{ backgroundColor: acc.color || "#6366f1" }}
                    />
                    <div className="pointer-events-none absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-white opacity-10 blur-xl" />

                    <div className="relative z-10">
                      {/* Card Header: Icon, Name, Type, Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-base tracking-tight drop-shadow-xs">
                                {acc.name}
                              </h3>
                              {acc.isDefault && (
                                <span className="rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white border border-white/20">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
                              {acc.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
                            title="Edit Account"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id, acc.name, acc.isDefault)}
                            className="rounded-lg p-1.5 text-white/70 hover:bg-rose-500/30 hover:text-rose-200 transition cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Chip & Wireless Contactless Indicator */}
                      <div className="my-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {/* Gold EMV Chip Simulation */}
                          <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-0.5 shadow-sm border border-amber-600/30 flex items-center justify-center">
                            <div className="h-full w-full rounded-xs border border-amber-800/25 grid grid-cols-2 gap-0.5 p-0.5 opacity-70">
                              <div className="border-r border-b border-amber-900/30" />
                              <div className="border-b border-amber-900/30" />
                              <div className="border-r border-amber-900/30" />
                              <div />
                            </div>
                          </div>
                          {/* Contactless symbol */}
                          <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M8.5 16.5a5 5 0 0 1 0-9" strokeLinecap="round" />
                            <path d="M12 19a8.5 8.5 0 0 0 0-14" strokeLinecap="round" />
                            <path d="M15.5 21.5a12 12 0 0 0 0-19" strokeLinecap="round" />
                          </svg>
                        </div>

                        {/* Masked Account Number */}
                        <span className="font-mono text-xs font-bold tracking-widest text-white/80">
                          •••• {acc.accountNumber ? acc.accountNumber.slice(-4) : "2489"}
                        </span>
                      </div>

                      {/* Balance Display */}
                      <div className="mt-2">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/60">
                          Available Balance
                        </span>
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums drop-shadow-xs ${isNegative ? "text-rose-300" : "text-white"}`}>
                          {formatCurrency(balNum, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Activity & Quick Actions */}
                    <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/15 pt-3.5 text-xs">
                      <span className="text-white/60 text-[11px]">
                        Added {new Date(acc.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button
                        onClick={() => (window.location.href = `/transactions?search=${encodeURIComponent(acc.name)}`)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white border border-white/20 transition cursor-pointer"
                      >
                        Transactions →
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Account Card Button */}
              <button
                onClick={handleOpenAdd}
                className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300/80 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:bg-slate-900/20 dark:hover:bg-indigo-500/5 p-6 transition group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 group-hover:scale-110 transition">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Connect New Account
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Add a bank, credit card, or wallet pass</p>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Add/Edit Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-up">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingAccount ? "Edit Account" : "Add New Account"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Salary Account, Cash Wallet"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Account Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className={inputCls}
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.label} value={t.label}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Current Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Account Number / Last 4 Digits (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4589"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Color Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Accent Color
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          form.color === c ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isDefault" className="text-xs text-slate-600 dark:text-slate-400">
                    Set as default account for new transactions
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editingAccount ? "Save Changes" : "Create Account"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Funds Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-up">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Transfer Between Accounts
                  </h3>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleTransfer} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      From Account
                    </label>
                    <select
                      value={transferForm.fromAccountId}
                      onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                      className={inputCls}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(Number(a.balance), currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      To Account
                    </label>
                    <select
                      value={transferForm.toAccountId}
                      onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                      className={inputCls}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(Number(a.balance), currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Transfer Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ATM Cash Withdrawal, Card Bill Payment"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={transferring}>
                    Complete Transfer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Alert Dialog */}
        <ConfirmDialog
          open={!!deletingAccount}
          onClose={() => setDeletingAccount(null)}
          onConfirm={confirmDeleteAccount}
          title="Delete Account?"
          message={
            deletingAccount?.isDefault && accounts.length > 1
              ? `Are you sure you want to delete "${deletingAccount?.name}"? Since this is your default account, another account will automatically be designated as your primary default.`
              : accounts.length === 1
              ? `Are you sure you want to delete "${deletingAccount?.name}"? This is your only account. You can create a new account at any time.`
              : `Are you sure you want to delete "${deletingAccount?.name}"? All transactions associated with this account will have their account link removed.`
          }
          loading={isDeleting}
          confirmText="Delete Account"
        />
      </div>
    </AppShell>
  );
}
