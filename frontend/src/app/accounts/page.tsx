"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
  Copy,
  ChevronRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge, inputCls, toast, ConfirmDialog } from "@/components/ui";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";
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

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
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
              className="h-9 px-3 text-xs w-full justify-center"
            >
              <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
            </Button>
            <Button onClick={handleOpenAdd} className="h-9 px-3 text-xs w-full justify-center">
              <Plus className="h-4 w-4 mr-1.5" /> Add Account
            </Button>
          </div>
        </div>

        {/* Net Worth & Assets 3-Card KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Card 1: Net Worth */}
          <div className="col-span-2 sm:col-span-1 rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#15181d] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Net Worth
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-[#bbf246]/10 text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/20 shadow-2xs">
                <Landmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(stats.netWorth, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {stats.accountCount} {stats.accountCount === 1 ? "active account" : "active accounts"} connected
            </p>
          </div>

          {/* Card 2: Liquid Assets */}
          <div className="col-span-1 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-[#0f172a] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Liquid Capital
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-2xs">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatCurrency(stats.totalAssets, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Cash & liquid
            </p>
          </div>

          {/* Card 3: Total Liabilities */}
          <div className="col-span-1 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-[#0f172a] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Total Liabilities
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 shadow-2xs">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
              {formatCurrency(stats.totalLiabilities, currency)}
            </p>
            <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Credit card dues
            </p>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connected Accounts & Ledgers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time balances, institution routing numbers, and transfer controls.
            </p>
          </div>
        </div>

        {/* Accounts Grid (Mercury / Stripe Executive Standard) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800/60" />
            ))
          ) : accounts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              No accounts connected yet. Click &quot;Add Account&quot; to link your first bank or wallet!
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
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] hover:shadow-xl hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#0f172a] dark:hover:border-indigo-500/40 transition-all duration-200"
                  >
                    <div>
                      {/* Card Top: Institution Icon, Name, Type & Edit Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                            style={{ backgroundColor: acc.color || "#4f46e5" }}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate">
                                {acc.name}
                              </h3>
                              {acc.isDefault && (
                                <span className="shrink-0 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                              {acc.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Edit Account"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id, acc.name, acc.isDefault)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 transition cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Account Number & 1-Click Copy */}
                      <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
                          •••• {acc.accountNumber ? acc.accountNumber.slice(-4) : "2489"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const num = acc.accountNumber || "2489";
                            navigator.clipboard.writeText(num);
                            toast(`Account number copied: ${num} 📋`);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition cursor-pointer"
                          title="Copy Account Number"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </button>
                      </div>

                      {/* Available Balance */}
                      <div className="mt-4">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Available Balance
                        </span>
                        <span className={`mt-0.5 block text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                          isNegative ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                        }`}>
                          {formatCurrency(balNum, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Footer: Quick Actions */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setTransferForm((prev) => ({
                            ...prev,
                            fromAccountId: acc.id,
                            toAccountId: accounts.find((a) => a.id !== acc.id)?.id || "",
                          }));
                          setShowTransferModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition cursor-pointer"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer
                      </button>

                      <Link
                        href={`/transactions?search=${encodeURIComponent(acc.name)}`}
                        className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                      >
                        Activity <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Connect New Account Card */}
              <button
                onClick={handleOpenAdd}
                className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300/80 hover:border-indigo-500 bg-white/40 hover:bg-indigo-50/20 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:bg-[#0f172a]/40 dark:hover:bg-indigo-500/5 p-6 transition-all group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Connect New Account
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Bank, credit card, or digital wallet</p>
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
                      Current Balance ({CURRENCY_SYMBOLS[currency] || currency})
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
                    Transfer Amount ({CURRENCY_SYMBOLS[currency] || currency})
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
