"use client";

import { useEffect, useState } from "react";
import { LogOut, Wallet, Target, ArrowDownLeft, ArrowUpRight, ShieldCheck, Mail, Globe } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<{ income: number; expenses: number; goals: number; budgets: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/transactions?limit=1", { credentials: "include" }).then((r) => r.json()).catch(() => null),
      fetch("/api/goals", { credentials: "include" }).then((r) => r.json()).catch(() => null),
      fetch("/api/budgets?month=all", { credentials: "include" }).then((r) => r.json()).catch(() => null),
    ]).then(([t, g, b]) => {
      setStats({
        income: t?.success ? t.data.summary.income : 0,
        expenses: t?.success ? t.data.summary.expenses : 0,
        goals: g?.success ? g.data.goals.length : 0,
        budgets: b?.success ? b.data.budgets.length : 0,
      });
    });
  }, []);

  const currency = (user as unknown as { currency?: string })?.currency || "INR";

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile & Account Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">Your identity, security status, and aggregate lifetime financial totals.</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* User Identity Card */}
        <div className="flex flex-col items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
          <div className="flex flex-col items-center">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || "User"}
                className="h-20 w-20 rounded-3xl object-cover shadow-md shadow-black/20 border-2 border-[#bbf246]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#bbf246] text-3xl font-black text-[#0b0e11] shadow-md shadow-black/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <h2 className="mt-3.5 text-lg font-black text-slate-900 dark:text-white">{user?.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              <span>{user?.email}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-[#bbf246]/20 px-2.5 py-0.5 text-xs font-bold text-slate-900 dark:bg-[#bbf246]/15 dark:text-[#bbf246]">
                {currency} Currency
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Active
              </span>
            </div>
          </div>

          <Button variant="danger" onClick={logout} className="mt-6 w-full h-9 text-xs font-bold">
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>

        {/* Lifetime Stats Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:col-span-2">
          {/* Lifetime Income */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifetime Inflow</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <ArrowDownLeft className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                {formatCurrency(stats?.income || 0, currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Cumulative incoming revenue</p>
            </div>
          </div>

          {/* Lifetime Expenses */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifetime Outflow</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                {formatCurrency(stats?.expenses || 0, currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Cumulative outgoing expenses</p>
            </div>
          </div>

          {/* Savings Goals */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Goals</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#bbf246]/20 text-slate-900 dark:bg-[#bbf246]/15 dark:text-[#bbf246] font-black">
                <Target className="h-4 w-4 stroke-[2.5]" />
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                {stats?.goals ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Savings targets in progress</p>
            </div>
          </div>

          {/* Budgets */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Configured Budgets</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                {stats?.budgets ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Active spending limit rules</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
