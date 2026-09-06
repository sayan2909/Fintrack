"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Badge, EmptyState } from "@/components/ui";

interface Notif { id: string; title: string; message: string; kind: string; isRead: boolean; createdAt: string }

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      const json = await res.json();
      if (json.success) setItems(json.data.notifications);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
    setItems((p) => p.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };
  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "PUT", credentials: "include" });
    setItems((p) => p.map((n) => ({ ...n, isRead: true })));
  };

  const kindTone = (k: string) => (k === "budget" ? "amber" : k === "goal" ? "green" : k === "recurring" ? "indigo" : "slate") as "amber";

  const [filter, setFilter] = useState("all");

  const filtered = items.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "budget") return n.kind === "budget";
    if (filter === "goal") return n.kind === "goal";
    if (filter === "recurring") return n.kind === "recurring";
    return true;
  });

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Budget warnings, upcoming bill reminders, milestone badges, and digest reports.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAll} className="h-9 px-3 text-xs font-semibold">
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mt-5 inline-flex flex-wrap items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/80 text-xs font-semibold">
        {[
          { label: "All", val: "all" },
          { label: "Unread", val: "unread" },
          { label: "Budgets", val: "budget" },
          { label: "Goals", val: "goal" },
          { label: "Recurring", val: "recurring" },
        ].map((t) => (
          <button
            key={t.val}
            onClick={() => setFilter(t.val)}
            className={`rounded-lg px-3 py-1.5 transition cursor-pointer text-xs font-bold ${
              filter === t.val
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Bell className="h-7 w-7" />}
            title="All caught up"
            message="No notifications match your current filter. You're completely up to date!"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 shadow-xs transition ${
                !n.isRead
                  ? "border-indigo-200/80 bg-indigo-50/20 dark:border-indigo-500/30 dark:bg-indigo-500/5"
                  : "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#111827]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? "bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-500/20" : "bg-slate-300 dark:bg-slate-700"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{n.title}</h3>
                    <Badge tone={kindTone(n.kind)}>{n.kind}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.message}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
