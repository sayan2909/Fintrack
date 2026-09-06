"use client";

import { useEffect, useState } from "react";
import { Plus, Target, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Trophy } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, Progress, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

interface Goal { id: string; name: string; targetAmount: string; currentAmount: string; targetDate: string | null; description: string | null; color: string; percentComplete: number; remaining: number; daysRemaining: number | null; monthlyNeeded: number | null }

export default function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [del, setDel] = useState<Goal | null>(null);
  const [money, setMoney] = useState<{ goal: Goal; action: "add" | "withdraw" } | null>(null);
  const [amt, setAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "", description: "", color: "#10b981" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals", { credentials: "include" });
      const json = await res.json();
      if (json.success) setGoals(json.data.goals);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const totalSaved = goals.reduce((acc, g) => acc + (parseFloat(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((acc, g) => acc + (parseFloat(g.targetAmount) || 0), 0);
  const achievedCount = goals.filter((g) => g.percentComplete >= 100).length;

  const openAdd = () => { setEditing(null); setForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "", description: "", color: "#10b981" }); setModal(true); };
  const openEdit = (g: Goal) => { setEditing(g); setForm({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, targetDate: g.targetDate || "", description: g.description || "", color: g.color }); setModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/goals/${editing.id}` : "/api/goals";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Goal updated" : "Goal created");
      setModal(false);
      load();
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const contribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!money) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${money.goal.id}/contribute`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ amount: amt, action: money.action }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(money.action === "add" ? "Money added 🎉" : "Money withdrawn");
      setMoney(null);
      setAmt("");
      load();
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    const res = await fetch(`/api/goals/${del.id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (json.success) { toast("Goal deleted"); setDel(null); load(); } else toast(json.message, "error");
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Savings Goals</h1>
          <p className="text-xs text-slate-500 mt-0.5">Emergency fund, laptop, vacation, investments — make it happen.</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-3.5 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> New Goal</Button>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Saved</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <PiggyBank className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatCurrency(totalSaved, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Across {goals.length} target goals</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Total</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Target className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(totalTarget, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Overall savings milestones</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Achieved Goals</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {achievedCount} / {goals.length}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{goals.length > 0 ? `${Math.round((achievedCount / goals.length) * 100)}% completed` : "No active goals"}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : goals.length === 0 ? (
        <div className="mt-4"><EmptyState icon={<Target className="h-7 w-7" />} title="No savings goals yet" message="Create your first goal — e.g. Emergency Fund, New Laptop, Vacation." action={<Button onClick={openAdd} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Create goal</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <div key={g.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-xs" style={{ background: g.color }}><Target className="h-5 w-5" /></div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 dark:text-white">{g.name}</h3>
                        {g.percentComplete >= 100 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            🎉 Achieved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{g.targetDate ? `Target: ${g.targetDate}` : "No deadline"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDel(g)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{g.percentComplete}%</p>
                  <p className="text-xs font-semibold text-slate-500">{formatCurrency(parseFloat(g.currentAmount), currency)} / {formatCurrency(parseFloat(g.targetAmount), currency)}</p>
                </div>
                <div className="mt-2"><Progress value={g.percentComplete} /></div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="text-[11px] text-slate-400">Remaining</p><p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(g.remaining, currency)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="text-[11px] text-slate-400">Days left</p><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{g.daysRemaining ?? "—"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><p className="text-[11px] text-slate-400">Per month</p><p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{g.monthlyNeeded != null ? formatCurrency(g.monthlyNeeded, currency) : "—"}</p></div>
                </div>
                {g.description && <p className="mt-2.5 text-xs text-slate-500">{g.description}</p>}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setMoney({ goal: g, action: "add" })} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"><ArrowDownToLine className="h-3.5 w-3.5" /> Add Funds</button>
                <button onClick={() => setMoney({ goal: g, action: "withdraw" })} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"><ArrowUpFromLine className="h-3.5 w-3.5" /> Withdraw</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Goal" : "New Savings Goal"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Goal name"><input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Emergency Fund" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target amount (₹)"><input className={inputCls} type="number" step="0.01" min="1" required value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} /></Field>
            <Field label="Current amount (₹)"><input className={inputCls} type="number" step="0.01" min="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} placeholder="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target date"><input className={inputCls} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
            <Field label="Color"><input className={inputCls} type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
          </div>
          <Field label="Description"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" loading={saving}>{editing ? "Save" : "Create"}</Button></div>
        </form>
      </Modal>

      <Modal open={!!money} onClose={() => setMoney(null)} title={money ? `${money.action === "add" ? "Add money to" : "Withdraw from"} ${money.goal.name}` : ""}>
        <form onSubmit={contribute} className="space-y-4">
          <Field label={`Amount (₹) — current ${money ? formatCurrency(parseFloat(money.goal.currentAmount), currency) : ""}`}>
            <input className={inputCls} type="number" step="0.01" min="0.01" required value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="1000" autoFocus />
          </Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setMoney(null)}>Cancel</Button><Button type="submit" loading={saving}>{money?.action === "add" ? "Add Money" : "Withdraw"}</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete goal?" message={`Delete "${del?.name}"?`} />
    </AppShell>
  );
}
