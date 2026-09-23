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
  Pencil,
  TrendingUp,
  Landmark,
  Coins,
  Copy,
  ChevronRight,
  Wifi,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  Clock,
  Layers,
  Sparkles,
  Check
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Modal, Field, inputCls, toast, ConfirmDialog, EmptyState } from "@/components/ui";
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

interface RecentTx {
  id: string;
  description: string;
  amount: string;
  type: "income" | "expense";
  date: string;
  categoryName?: string;
  accountId?: string;
  paymentMethod?: string;
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

const ACCOUNT_TYPES = [
  { label: "Bank Account", icon: Building2, desc: "Checking & Savings institution" },
  { label: "Credit Card", icon: CreditCard, desc: "Revolving credit line & cards" },
  { label: "Digital Wallet", icon: Wallet, desc: "UPI, Apple Pay & e-wallets" },
  { label: "Cash", icon: Coins, desc: "Physical cash & petty cash" },
  { label: "Investment", icon: TrendingUp, desc: "Brokerage & mutual funds" },
];

const COLOR_PRESETS = [
  "#bbf246", // FinTrack Electric Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Electric Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Neon Pink
  "#f43f5e", // Rose
  "#f97316", // Amber
  "#f59e0b", // Warm Gold
  "#14b8a6", // Teal
  "#64748b", // Slate
];

export default function AccountsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState<AccountItem | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState("");
  const [adjustingSaving, setAdjustingSaving] = useState(false);

  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: "",
    type: "Bank Account",
    balance: "",
    accountNumber: "",
    color: "#bbf246",
    isDefault: false,
  });

  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        fetch("/api/accounts", { credentials: "include" }),
        fetch("/api/transactions?limit=6", { credentials: "include" }),
      ]);
      const accJson = await accRes.json();
      const txJson = await txRes.json();

      if (accJson.success && Array.isArray(accJson.data?.accounts)) {
        setAccounts(accJson.data.accounts);
      }
      if (txJson.success && Array.isArray(txJson.data?.transactions)) {
        setRecentTxs(txJson.data.transactions);
      }
    } catch {
      toast("Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of accounts) {
      const bal = Number(acc.balance) || 0;
      if (acc.type === "Credit Card") {
        totalLiabilities += Math.abs(bal);
      } else {
        if (bal >= 0) totalAssets += bal;
        else totalLiabilities += Math.abs(bal);
      }
    }

    const netWorth = totalAssets - totalLiabilities;
    const totalVolume = totalAssets + totalLiabilities;
    const liquidRatio = totalVolume > 0 ? Math.round((totalAssets / totalVolume) * 100) : 100;

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      liquidRatio,
      accountCount: accounts.length,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (activeFilter === "all") return accounts;
    if (activeFilter === "bank") return accounts.filter((a) => a.type === "Bank Account");
    if (activeFilter === "credit") return accounts.filter((a) => a.type === "Credit Card");
    if (activeFilter === "wallet") return accounts.filter((a) => a.type === "Digital Wallet" || a.type === "Cash");
    return accounts;
  }, [accounts, activeFilter]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setForm({
      name: "",
      type: "Bank Account",
      balance: "0",
      accountNumber: "",
      color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
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
      color: acc.color || COLOR_PRESETS[0],
      isDefault: acc.isDefault,
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (acc: AccountItem) => {
    setAdjustingAccount(acc);
    setNewBalanceInput(acc.balance);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingAccount) return;
    setAdjustingSaving(true);
    try {
      const res = await fetch(`/api/accounts/${adjustingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ balance: newBalanceInput }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast("Balance updated successfully");
      setAdjustingAccount(null);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update balance", "error");
    } finally {
      setAdjustingSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Account title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : "/api/accounts";
      const res = await fetch(url, {
        method: editingAccount ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          balance: form.balance || "0",
          accountNumber: form.accountNumber.trim() || null,
          color: form.color,
          isDefault: form.isDefault,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editingAccount ? "Account updated successfully" : "New account linked successfully");
      setShowAddModal(false);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to save account", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${deletingAccount.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(`"${deletingAccount.name}" removed successfully`);
      setDeletingAccount(null);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete account", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(transferForm.amount);
    if (!transferForm.fromAccountId || !transferForm.toAccountId) {
      toast("Select both origin and target accounts", "error");
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      toast("Source and destination must be different accounts", "error");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("Enter a valid transfer amount", "error");
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
      toast("Funds transferred successfully 🎉");
      setShowTransferModal(false);
      setTransferForm({
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
      });
      loadData();
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
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf246]/30 bg-[#bbf246]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#bbf246]">
                <Landmark className="h-3 w-3" /> Treasury & Liquidity Management
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Accounts, Cards & Liquidity
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage multi-institution bank balances, credit lines, and execute instant inter-account capital transfers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                if (accounts.length < 2) {
                  toast("You need at least 2 accounts to execute a transfer", "error");
                  return;
                }
                setTransferForm((prev) => ({
                  ...prev,
                  fromAccountId: accounts[0]?.id || "",
                  toAccountId: accounts[1]?.id || "",
                }));
                setShowTransferModal(true);
              }}
              className="h-10 px-4 text-xs font-bold rounded-xl border-slate-200 dark:border-white/[0.08] dark:bg-[#15181d] dark:hover:bg-white/[0.05]"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Transfer
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="h-10 px-4 text-xs font-black shadow-xs bg-[#bbf246] hover:bg-[#a8dc39] text-[#0b0e11] cursor-pointer rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Executive Net Worth & Assets 3-Pod Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Pod 1: Net Worth */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Consolidated Net Worth
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#bbf246]/10 text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/20">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                {loading ? "..." : formatCurrency(stats.netWorth, currency)}
              </p>
              {/* Proportional Asset vs Liability Track */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 flex">
                <div
                  className="h-full bg-[#bbf246] transition-all duration-500"
                  style={{ width: `${stats.liquidRatio}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${100 - stats.liquidRatio}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
                <span className="text-emerald-500 dark:text-[#bbf246]">
                  {stats.liquidRatio}% Assets
                </span>
                <span className="text-rose-500">
                  {100 - stats.liquidRatio}% Liabilities
                </span>
              </div>
            </div>
          </div>

          {/* Pod 2: Liquid Assets */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Liquid Capital Reserves
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                {loading ? "..." : formatCurrency(stats.totalAssets, currency)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                Checking, savings & cash funds
              </p>
              <div className="mt-2 text-[11px] text-slate-400">
                Available for immediate disbursement
              </div>
            </div>
          </div>

          {/* Pod 3: Total Liabilities */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#15181d] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Credit Liabilities
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-500/20">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                {loading ? "..." : formatCurrency(stats.totalLiabilities, currency)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                Credit cards & revolving obligations
              </p>
              <div className="mt-2 text-[11px] text-slate-400">
                Monitored against credit limits
              </div>
            </div>
          </div>
        </div>

        {/* Section Heading & Category Filter Pills */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Connected Ledgers & Smart Cards</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive physical-style digital card skins with real-time balance tracking.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-full border border-slate-200/90 bg-slate-100 p-0.5 dark:border-white/[0.08] dark:bg-[#15181d] overflow-x-auto no-scrollbar">
            {[
              { key: "all", label: "All Ledgers", count: accounts.length },
              { key: "bank", label: "Banks", count: accounts.filter((a) => a.type === "Bank Account").length },
              { key: "credit", label: "Cards", count: accounts.filter((a) => a.type === "Credit Card").length },
              { key: "wallet", label: "Wallets", count: accounts.filter((a) => a.type === "Digital Wallet" || a.type === "Cash").length },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveFilter(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeFilter === t.key
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-[#bbf246] dark:text-[#0b0e11] font-black"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeFilter === t.key
                      ? "bg-black/15 text-slate-900 dark:text-[#0b0e11]"
                      : "bg-slate-200/80 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Luxury Accounts Showcase Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse dark:bg-[#15181d] border border-slate-200/80 dark:border-white/[0.08]" />
            ))
          ) : filteredAccounts.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
              <EmptyState
                icon={<Landmark className="h-10 w-10 text-[#bbf246]" />}
                title="No accounts in this filter"
                message="Add your bank accounts, credit cards, or digital wallets to track total liquidity."
                action={
                  <Button onClick={handleOpenAdd} className="h-9 px-4 text-xs font-bold bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39]">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Link Account
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {filteredAccounts.map((acc) => {
                const IconComp = getAccountIcon(acc.type);
                const balNum = Number(acc.balance) || 0;
                const isNegative = balNum < 0;
                const isCredit = acc.type === "Credit Card";
                const accColor = acc.color || "#bbf246";
                const rawNumber = acc.accountNumber || "2489";
                const maskedDisplay = `••••  ••••  ••••  ${rawNumber.slice(-4)}`;

                return (
                  <div
                    key={acc.id}
                    className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:border-white/[0.1] dark:from-[#181c23] dark:via-[#14171c] dark:to-[#0d1014] overflow-hidden min-h-[250px]"
                  >
                    {/* Ambient Glow */}
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-10 group-hover:opacity-25 transition-opacity blur-3xl"
                      style={{ backgroundColor: accColor }}
                    />

                    {/* Card Top: Chip + Contactless + Badges + Edit/Delete */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        {/* EMV Gold Chip & Contactless Wave */}
                        <div className="flex items-center gap-3">
                          <div className="relative h-7 w-9 rounded-md bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-500 p-0.5 shadow-xs border border-amber-200/60 flex flex-col justify-between overflow-hidden shrink-0">
                            <div className="flex justify-between h-full w-full">
                              <div className="w-[1px] h-full bg-amber-700/30" />
                              <div className="w-[1px] h-full bg-amber-700/30" />
                            </div>
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-700/30" />
                          </div>
                          <Wifi className="h-4 w-4 rotate-90 text-slate-400 group-hover:text-slate-200 transition-colors" />
                        </div>

                        {/* Top Right Badges & Actions */}
                        <div className="flex items-center gap-1.5">
                          {acc.isDefault ? (
                            <span className="rounded-full bg-[#bbf246]/15 border border-[#bbf246]/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-900 dark:text-[#bbf246]">
                              Default
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {acc.type.split(" ")[0]}
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer transition"
                            title="Edit Account Details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingAccount(acc)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer transition"
                            title="Delete Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Identity & Account Number */}
                      <div className="mt-5">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-white text-[10px]"
                            style={{ backgroundColor: accColor }}
                          >
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight truncate group-hover:text-[#bbf246] transition-colors">
                            {acc.name}
                          </h3>
                        </div>

                        {/* Masked Card Number with 1-Click Copy */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-300">
                            {maskedDisplay}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(rawNumber);
                              toast(`Account number copied: ${rawNumber} 📋`);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-[#bbf246] transition cursor-pointer"
                            title="Copy Account Number"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>

                      {/* Balance Area */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isCredit ? "Outstanding Balance" : "Available Funds"}
                        </span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                            isNegative || isCredit
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-900 dark:text-white"
                          }`}>
                            {formatCurrency(balNum, currency)}
                          </p>
                          <button
                            onClick={() => handleOpenAdjust(acc)}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-[#bbf246] transition cursor-pointer"
                            title="Quick Adjust Starting Balance"
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Quick Transfer & Ledger Link */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setTransferForm((prev) => ({
                            ...prev,
                            fromAccountId: acc.id,
                            toAccountId: accounts.find((a) => a.id !== acc.id)?.id || "",
                          }));
                          setShowTransferModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-[#bbf246] transition cursor-pointer"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Transfer</span>
                      </button>

                      <Link
                        href={`/transactions?accountId=${acc.id}`}
                        className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-slate-900 dark:hover:text-[#bbf246] transition"
                      >
                        <span>Ledger</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Connect New Account Card */}
              <button
                onClick={handleOpenAdd}
                className="group flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300/80 bg-white/40 p-6 text-center shadow-xs transition-all hover:border-[#bbf246] hover:bg-[#bbf246]/5 dark:border-white/[0.1] dark:bg-[#15181d]/50 dark:hover:border-[#bbf246] cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-transform group-hover:scale-110 group-hover:bg-[#bbf246] group-hover:text-[#0b0e11] dark:bg-white/[0.06] dark:text-slate-300">
                  <Plus className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#bbf246]">
                    Connect New Account
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Add bank, credit card, cash or digital wallet
                  </p>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Recent Treasury Activity Feed (Eliminates Empty Space) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#bbf246]/10 text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Recent Treasury Movements
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest inflows, debits, and transfers recorded across your connected accounts.
                </p>
              </div>
            </div>

            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-[#bbf246] transition"
            >
              <span>View Full Ledger</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4">
            {recentTxs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions logged across your connected accounts yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {recentTxs.map((t) => {
                  const isInc = t.type === "income";
                  const acc = accounts.find((a) => a.id === t.accountId);
                  const amtNum = parseFloat(t.amount || "0");

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-3 transition hover:bg-slate-50/50 dark:hover:bg-white/[0.02] rounded-xl px-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isInc
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {t.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span>{t.date}</span>
                            <span>•</span>
                            <span
                              className="rounded-md px-1.5 py-0.2 font-semibold text-slate-800 dark:text-slate-200"
                              style={{ backgroundColor: hexToRgba(acc?.color || "#6366f1", 0.15) }}
                            >
                              {acc?.name || "Main Ledger"}
                            </span>
                            {t.categoryName && (
                              <>
                                <span>•</span>
                                <span>{t.categoryName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black tabular-nums ${
                          isInc ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                        }`}>
                          {isInc ? "+" : "−"}{formatCurrency(amtNum, currency)}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {t.paymentMethod || "Direct"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add / Edit Account Modal with Live Card Preview */}
        <Modal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={editingAccount ? "Edit Account Details" : "Connect New Account"}
        >
          <form onSubmit={handleSaveAccount} className="space-y-4 pt-1">
            {/* Live Interactive Card Preview */}
            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4.5 dark:border-white/[0.08] dark:from-[#181c23] dark:via-[#14171c] dark:to-[#0d1014] relative overflow-hidden shadow-sm">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: form.color }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-8 rounded-md bg-gradient-to-tr from-amber-400 to-amber-500 border border-amber-300/60" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {form.type}
                  </span>
                </div>
                {form.isDefault && (
                  <span className="rounded-full bg-[#bbf246]/15 border border-[#bbf246]/30 px-2 py-0.2 text-[9px] font-black uppercase text-[#bbf246]">
                    Primary
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-base font-black text-slate-900 dark:text-white truncate">
                  {form.name.trim() || "Untitled Account"}
                </p>
                <p className="font-mono text-xs text-slate-400 mt-1 tracking-widest">
                  ••••  ••••  ••••  {form.accountNumber.trim() ? form.accountNumber.slice(-4) : "0000"}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Starting Balance</span>
                <span className="font-black text-base text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(form.balance || 0, currency)}
                </span>
              </div>
            </div>

            {/* Account Title */}
            <Field label="Account Nickname">
              <input
                type="text"
                required
                placeholder="e.g. HDFC Salary Account, ICICI Coral Card, Cash"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                autoFocus
              />
            </Field>

            {/* Account Type & Balance */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account Classification">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={`${inputCls} bg-white text-slate-900 dark:bg-[#15181d] dark:text-white cursor-pointer`}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.label} value={t.label} className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Initial Balance (${CURRENCY_SYMBOLS[currency] || currency})`}>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Account Number */}
            <Field label="Last 4 Digits or Account ID (Optional)">
              <input
                type="text"
                maxLength={16}
                placeholder="e.g. 4589"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                className={inputCls}
              />
            </Field>

            {/* Accent Color Presets */}
            <Field label="Card Accent Skin">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full transition-transform cursor-pointer ${
                      form.color === c ? "scale-115 ring-2 ring-[#bbf246] ring-offset-2 dark:ring-offset-[#15181d]" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && <Check className="h-3.5 w-3.5 text-black stroke-[3] mx-auto" />}
                  </button>
                ))}
              </div>
            </Field>

            {/* Default Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#bbf246] focus:ring-[#bbf246] accent-[#bbf246] cursor-pointer"
              />
              <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Designate as Primary Default Account
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="h-9 px-5 text-xs font-black bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39] rounded-xl shadow-xs">
                {editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Transfer Funds Modal */}
        <Modal
          open={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          title="Inter-Account Capital Transfer"
        >
          <form onSubmit={handleTransfer} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source Account">
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                  className={`${inputCls} bg-white text-slate-900 dark:bg-[#15181d] dark:text-white cursor-pointer`}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">
                      {a.name} ({formatCurrency(Number(a.balance), currency)})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Destination Account">
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                  className={`${inputCls} bg-white text-slate-900 dark:bg-[#15181d] dark:text-white cursor-pointer`}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white text-slate-900 dark:bg-[#15181d] dark:text-white">
                      {a.name} ({formatCurrency(Number(a.balance), currency)})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={`Transfer Amount (${CURRENCY_SYMBOLS[currency] || currency})`}>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Transfer Reference / Memo">
              <input
                type="text"
                placeholder="e.g. Card Payment, Cash Withdrawal, Capital Rebalance"
                value={transferForm.description}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Transfer Execution Date">
              <input
                type="date"
                required
                value={transferForm.date}
                onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <Button type="button" variant="secondary" onClick={() => setShowTransferModal(false)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button type="submit" loading={transferring} className="h-9 px-5 text-xs font-black bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39] rounded-xl shadow-xs">
                Execute Transfer
              </Button>
            </div>
          </form>
        </Modal>

        {/* Quick Adjust Balance Modal */}
        <Modal
          open={!!adjustingAccount}
          onClose={() => setAdjustingAccount(null)}
          title={`Adjust Balance for ${adjustingAccount?.name}`}
        >
          <form onSubmit={handleSaveAdjust} className="space-y-4 pt-1">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-white/[0.08] dark:bg-[#15181d]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Recorded Balance</span>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatCurrency(Number(adjustingAccount?.balance || 0), currency)}
              </p>
            </div>

            <Field label={`New Reconciled Balance (${CURRENCY_SYMBOLS[currency] || currency})`}>
              <input
                type="number"
                step="0.01"
                required
                value={newBalanceInput}
                onChange={(e) => setNewBalanceInput(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </Field>

            {newBalanceInput && !isNaN(Number(newBalanceInput)) && (
              <div className="text-xs font-semibold text-slate-500">
                Adjustment Delta:{" "}
                <span className={Number(newBalanceInput) - Number(adjustingAccount?.balance || 0) >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                  {Number(newBalanceInput) - Number(adjustingAccount?.balance || 0) >= 0 ? "+" : ""}
                  {formatCurrency(Number(newBalanceInput) - Number(adjustingAccount?.balance || 0), currency)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <Button type="button" variant="secondary" onClick={() => setAdjustingAccount(null)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button type="submit" loading={adjustingSaving} className="h-9 px-5 text-xs font-black bg-[#bbf246] text-[#0b0e11] hover:bg-[#a8dc39] rounded-xl shadow-xs">
                Save Reconciled Balance
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Alert Dialog */}
        <ConfirmDialog
          open={!!deletingAccount}
          onClose={() => setDeletingAccount(null)}
          onConfirm={handleDeleteAccount}
          title="Delete this account?"
          message={`Are you sure you want to remove "${deletingAccount?.name}"? All existing transactions will have their account reference unlinked without deleting your ledger history.`}
          loading={isDeleting}
          confirmText="Delete Account"
        />
      </div>
    </AppShell>
  );
}
