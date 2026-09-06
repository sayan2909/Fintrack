"use client";

import { useEffect, useState } from "react";
import { Plus, Wallet, Pencil, Trash2, ArrowUpRight, PiggyBank, PieChart } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, Badge, Progress, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Budget { id: string; categoryName: string; amount: string; month: string; description: string | null; spent: number; remaining: number; percentUsed: number; status: string }
interface Cat { id: string; name: string; type: string }

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState({ totalBudget: 0, totalSpent: 0, remaining: 0, percentUsed: 0 });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [del, setDel] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ categoryName: "", amount: "", month: new Date().toISOString().slice(0, 7), description: "" });

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${m}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setBudgets(json.data.budgets);
        setSummary(json.data.summary);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" }).then((r) => r.json()).then((j) => j.success && setCats(j.data.categories.filter((c: Cat) => c.type === "expense")));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => { setEditing(null); setForm({ categoryName: "", amount: "", month, description: "" }); setModal(true); };
  const openEdit = (b: Budget) => { setEditing(b); setForm({ categoryName: b.categoryName, amount: b.amount, month: b.month, description: b.description || "" }); setModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/budgets/${editing.id}` : "/api/budgets";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Budget updated" : "Budget created");
      setModal(false);
      load(form.month);
      setMonth(form.month);
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    const res = await fetch(`/api/budgets/${del.id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (json.success) {
      toast("Budget deleted");
      setDel(null);
      load();
    } else toast(json.message, "error");
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Budgets</h1>
          <p className="text-sm text-slate-500">Monthly spending limits and threshold alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); load(e.target.value); }} className={`${inputCls} h-9 text-xs`} style={{ width: "auto" }} />
          <Button onClick={openAdd} className="h-9 px-3 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> New Budget</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Budget</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(summary.totalBudget, currency)}
            </p>
          </div>
        </Card>

        {/* Total Spent */}
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Spent</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(summary.totalSpent, currency)}
            </p>
          </div>
        </Card>

        {/* Remaining */}
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Remaining</p>
            <p className={`mt-0.5 text-xl sm:text-2xl font-black tracking-tight ${summary.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatCurrency(summary.remaining, currency)}
            </p>
          </div>
        </Card>

        {/* Used % */}
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <PieChart className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget Used</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary.percentUsed}%
            </p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{[1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>
      ) : budgets.length === 0 ? (
        <div className="mt-4"><EmptyState icon={<Wallet className="h-7 w-7" />} title="No budgets for this month" message="Create a monthly budget to control spending per category." action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Create budget</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {budgets.map((b) => (
            <Card key={b.id} className={b.status === "over" ? "border-rose-300/80 dark:border-rose-500/40" : b.status === "warning" ? "border-amber-300/80 dark:border-amber-500/40" : ""}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{b.categoryName}</h3>
                    <Badge tone={b.status === "over" ? "red" : b.status === "warning" ? "amber" : "green"}>
                      {b.status === "over" ? "Over Budget" : b.status === "warning" ? "Approaching Limit" : "On Track"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{b.month}{b.description ? ` · ${b.description}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 cursor-pointer" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDel(b)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 cursor-pointer" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(b.spent, currency)}{" "}
                <span className="text-sm font-medium text-slate-500">/ {formatCurrency(parseFloat(b.amount), currency)}</span>
              </p>
              <div className="mt-2">
                <Progress value={b.percentUsed} color={b.status === "over" ? "bg-rose-500" : b.percentUsed >= 80 ? "bg-amber-500" : "bg-emerald-500"} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                <span className={b.status === "over" ? "text-rose-600 dark:text-rose-400" : b.percentUsed >= 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                  {b.percentUsed}% used
                </span>
                <span className="text-slate-500">
                  {b.status === "over"
                    ? `Over by ${formatCurrency(Math.abs(b.remaining), currency)}`
                    : `${formatCurrency(b.remaining, currency)} remaining`}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Budget" : "New Budget"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Category">
            {editing ? <input className={inputCls} value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} /> : (
              <select className={inputCls} required value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })}>
                <option value="">Select category</option>
                {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)"><input className={inputCls} type="number" step="0.01" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Month"><input className={inputCls} type="month" required value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
          </div>
          <Field label="Description (optional)"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Festive month" /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" loading={saving}>{editing ? "Save" : "Create"}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete budget?" message={`Delete ${del?.categoryName} budget?`} />
    </AppShell>
  );
}
