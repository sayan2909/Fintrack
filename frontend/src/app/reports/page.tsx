"use client";

import { useEffect, useState } from "react";
import { Download, FileText, ArrowDownLeft, ArrowUpRight, Wallet, Percent, Calendar } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, inputCls, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Report {
  period: { from: string; to: string; preset: string };
  summary: { income: number; expenses: number; net: number; savingsRate: number; count: number };
  categoryBreakdown: { name: string; income: number; expenses: number; count: number; net: number }[];
  budgetPerformance: { id: string; categoryName: string; amount: string; spent: number; percentUsed: number }[];
  savingsProgress: { id: string; name: string; targetAmount: string; currentAmount: string; percentComplete: number }[];
  byPaymentMethod: { name: string; count: number }[];
}

export default function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [preset, setPreset] = useState("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (p = preset, f = from, t = to) => {
    setLoading(true);
    try {
      let url = `/api/reports?preset=${p}`;
      if (p === "custom" && f && t) url += `&from=${f}&to=${t}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (preset !== "custom") load(preset); /* eslint-disable-next-line */ }, [preset]);

  const exportCsv = () => {
    let url = `/api/reports?preset=${preset}&format=csv`;
    if (preset === "custom" && from && to) url += `&from=${from}&to=${to}`;
    window.location.href = url;
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3.5 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reports & Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive periodic summaries and tax-ready audit statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportPdf} className="h-9 px-3 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
          <Button onClick={exportCsv} className="h-9 px-3.5 text-xs font-bold">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Preset Selector Card */}
      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/80 text-xs font-semibold">
            {[["monthly", "Monthly"], ["quarterly", "Quarterly"], ["yearly", "Yearly"], ["custom", "Custom"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPreset(v)}
                className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer text-xs font-bold ${
                  preset === v
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              <Button onClick={() => load("custom", from, to)} className="h-8.5 px-3 text-xs font-bold">Apply</Button>
            </div>
          )}

          {data && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span>{data.period.from} → {data.period.to}</span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-slate-700 dark:text-slate-300">
                {data.summary.count} txns
              </span>
            </div>
          )}
        </div>
      </div>

      {loading || !data ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ) : (
        <>
          {/* 4 Summary KPI Cards */}
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Income</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <ArrowDownLeft className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                  {formatCurrency(data.summary.income, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Total period revenue</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Expenses</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                  {formatCurrency(data.summary.expenses, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Total period expenditures</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Savings</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <p className={`text-2xl font-black tracking-tight tabular-nums ${data.summary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {formatCurrency(data.summary.net, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Retained net cash</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Savings Rate</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                  <Percent className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400 tracking-tight tabular-nums">
                  {data.summary.savingsRate}%
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Savings efficiency</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-indigo-600" /> Category Breakdown</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Category</th><th className="py-2 text-right">Income</th><th className="py-2 text-right">Expenses</th><th className="py-2 text-right">Net</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.categoryBreakdown.map((c) => (
                      <tr key={c.name}><td className="py-2 font-semibold">{c.name} <span className="text-xs text-slate-400">×{c.count}</span></td><td className="py-2 text-right text-emerald-600">{formatCurrency(c.income, currency)}</td><td className="py-2 text-right text-rose-500">{formatCurrency(c.expenses, currency)}</td><td className="py-2 text-right font-bold">{formatCurrency(c.net, currency)}</td></tr>
                    ))}
                    {data.categoryBreakdown.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No data in period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <h3 className="font-bold">Budget Performance</h3>
                <div className="mt-2 space-y-2">
                  {data.budgetPerformance.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm"><span className="font-semibold">{b.categoryName}</span><span className="text-xs text-slate-500">{b.percentUsed}% used</span><Badge tone={b.percentUsed >= 100 ? "red" : b.percentUsed >= 80 ? "amber" : "green"}>{formatCurrency(b.spent, currency)} / {formatCurrency(parseFloat(b.amount), currency)}</Badge></div>
                  ))}
                  {data.budgetPerformance.length === 0 && <p className="text-sm text-slate-500">No budgets in this period.</p>}
                </div>
              </Card>
              <Card>
                <h3 className="font-bold">Savings Progress</h3>
                <div className="mt-2 space-y-2">
                  {data.savingsProgress.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm"><span className="font-semibold">{g.name}</span><Badge tone="indigo">{g.percentComplete}% · {formatCurrency(parseFloat(g.currentAmount), currency)}</Badge></div>
                  ))}
                  {data.savingsProgress.length === 0 && <p className="text-sm text-slate-500">No goals yet.</p>}
                </div>
              </Card>
              <Card>
                <h3 className="font-bold">Transaction Summary</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.byPaymentMethod.map((m) => <Badge key={m.name} tone="slate">{m.name}: {m.count}</Badge>)}
                  {data.byPaymentMethod.length === 0 && <p className="text-sm text-slate-500">No transactions.</p>}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
