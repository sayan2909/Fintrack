"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Modal, Field, inputCls, Badge, EmptyState, ConfirmDialog, toast } from "@/components/ui";
import { CATEGORY_COLORS } from "@/lib/constants";

interface Cat { id: string; name: string; type: string; color: string; icon: string; isDefault: boolean }

export default function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("expense");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [del, setDel] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "expense", color: CATEGORY_COLORS[0] });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      const json = await res.json();
      if (json.success) setCats(json.data.categories);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", type: tab, color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)] }); setModal(true); };
  const openEdit = (c: Cat) => { setEditing(c); setForm({ name: c.name, type: c.type, color: c.color }); setModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(editing ? "Category updated" : "Category created");
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
    const res = await fetch(`/api/categories/${del.id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (json.success) { toast("Category deleted"); setDel(null); load(); }
    else toast(json.message, "error");
  };

  const filtered = cats.filter((c) => c.type === tab);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Categories</h1>
            <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {filtered.length} {tab}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Customize your personal income and expense classifications.</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-3.5 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> New Category</Button>
      </div>

      {/* Segmented type control */}
      <div className="mt-5 inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/80 text-xs font-semibold">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 transition cursor-pointer text-xs font-bold capitalize ${
              tab === t
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t} Categories
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Tag className="h-7 w-7" />}
            title="No categories found"
            message={`No ${tab} categories yet. Create one to organize transactions.`}
            action={<Button onClick={openAdd} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add category</Button>}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md dark:border-slate-800/80 dark:bg-[#111827]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                  style={{ background: c.color }}
                >
                  <Tag className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 dark:text-white text-sm">{c.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${
                      c.type === "income" ? "text-emerald-500" : "text-slate-400"
                    }`}>
                      {c.type}
                    </span>
                    {c.isDefault && (
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 cursor-pointer transition"
                  title="Edit category"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDel(c)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer transition"
                  title="Delete category"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Category" : "New Category"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name"><input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pets" /></Field>
          <Field label="Type"><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={!!editing}><option value="expense">Expense</option><option value="income">Income</option></select></Field>
          <Field label="Color"><div className="flex flex-wrap gap-2">{CATEGORY_COLORS.map((c) => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full ${form.color === c ? "ring-2 ring-indigo-600 ring-offset-2" : ""}`} style={{ background: c }} />)}</div></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" loading={saving}>{editing ? "Save" : "Create"}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete category?" message={`Delete "${del?.name}"? Transactions using it must be reassigned or deleted first.`} />
    </AppShell>
  );
}
