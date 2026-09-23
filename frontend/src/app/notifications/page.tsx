"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell, CheckCheck, Trash2, Sliders, AlertTriangle, Trophy,
  Calendar, Repeat, ShieldCheck, Search, X, ArrowRight,
  Sparkles, CheckCircle2, Clock, AlertCircle, ExternalLink
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Badge, EmptyState, ConfirmDialog, toast } from "@/components/ui";

interface Notif {
  id: string;
  title: string;
  message: string;
  kind: string;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "budget" | "goal" | "recurring">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      const json = await res.json();
      if (json.success) setItems(json.data.notifications || []);
    } catch {
      toast("Unable to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      toast("Notification marked as read");
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const markAll = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT", credentials: "include" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast("All notifications marked as read");
    } catch {
      toast("Failed to mark all as read", "error");
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((n) => n.id !== id));
        toast("Notification dismissed");
      }
    } catch {
      toast("Failed to delete notification", "error");
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/notifications/clear-all", { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setItems([]);
        toast("All alerts cleared");
      }
    } catch {
      toast("Failed to clear alerts", "error");
    } finally {
      setConfirmClear(false);
    }
  };

  // Metrics
  const totalCount = items.length;
  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);
  const budgetCount = useMemo(() => items.filter((n) => n.kind === "budget").length, [items]);
  const goalCount = useMemo(() => items.filter((n) => n.kind === "goal").length, [items]);
  const recurringCount = useMemo(() => items.filter((n) => n.kind === "recurring").length, [items]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === "unread" && n.isRead) return false;
      if (filter === "budget" && n.kind !== "budget") return false;
      if (filter === "goal" && n.kind !== "goal") return false;
      if (filter === "recurring" && n.kind !== "recurring") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filter, searchQuery]);

  const getNotifDetails = (n: Notif) => {
    switch (n.kind) {
      case "budget":
        return {
          icon: AlertTriangle,
          iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/60 dark:border-0",
          tagLabel: "Budget Warning",
          badgeColor: "red" as const,
          actionLink: "/budgets",
          actionText: "View Budget Limit",
        };
      case "goal":
        return {
          icon: Trophy,
          iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-0",
          tagLabel: "Savings Milestone",
          badgeColor: "green" as const,
          actionLink: "/goals",
          actionText: "Open Savings Vault",
        };
      case "recurring":
        return {
          icon: Calendar,
          iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-200/60 dark:border-0",
          tagLabel: "Bill Due Date",
          badgeColor: "blue" as const,
          actionLink: "/recurring",
          actionText: "Review Upcoming Bill",
        };
      default:
        return {
          icon: Bell,
          iconBg: "bg-slate-50 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300 border border-slate-200/60 dark:border-0",
          tagLabel: "System Alert",
          badgeColor: "slate" as const,
          actionLink: "/settings",
          actionText: "Security & Profile",
        };
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* ── 1. Executive Header ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-xs animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Financial Intelligence & Alerts
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Notification Center
              </h1>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-black text-slate-900 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20">
                  {unreadCount} Action Needed
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  All Caught Up
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Real-time spending thresholds, bill countdowns, milestone achievements, and security events.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAll}
                className="h-9 px-3 text-xs font-bold border-slate-200/80 dark:border-white/[0.08]"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Mark all read
              </Button>
            )}

            {totalCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setConfirmClear(true)}
                className="h-9 px-3 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border-slate-200/80 dark:border-white/[0.08]"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear alerts
              </Button>
            )}

            <Link href="/settings">
              <Button
                variant="secondary"
                className="h-9 px-3 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08]"
              >
                <Sliders className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Preferences
              </Button>
            </Link>
          </div>
        </div>

        {/* ── 2. Executive Stat Summary Ribbon ───────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Total Recorded */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Alerts
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {totalCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recorded in activity ledger</p>
          </div>

          {/* Card 2: Unread Items */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Unread Items
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {unreadCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Requiring your attention</p>
          </div>

          {/* Card 3: Budget Warnings */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Budget Warnings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {budgetCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Thresholds & limit caps</p>
          </div>

          {/* Card 4: Upcoming Bills */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Upcoming Bills
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
              {recurringCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Due within next 7 days</p>
          </div>
        </div>

        {/* ── 3. Filter & Search Toolbar ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/80 dark:border-white/[0.08] dark:bg-[#15181d] overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: "all", label: "All Alerts", count: totalCount },
              { id: "unread", label: "Unread", count: unreadCount },
              { id: "budget", label: "Budgets", count: budgetCount },
              { id: "goal", label: "Goals", count: goalCount },
              { id: "recurring", label: "Bills Due", count: recurringCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  filter === tab.id
                    ? "bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-semibold font-black"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    filter === tab.id
                      ? "bg-slate-100 text-slate-900 dark:bg-black/20 dark:text-slate-950"
                      : "bg-slate-200/70 text-slate-600 dark:bg-white/[0.08] dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-full sm:w-64 rounded-xl border border-slate-200/80 bg-white pl-8 pr-7 text-xs placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-white/[0.08] dark:bg-[#15181d] dark:text-slate-100 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── 4. Notifications List ────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white p-12 text-center dark:border-white/[0.08] dark:bg-[#15181d]">
            <EmptyState
              icon={<Bell className="h-8 w-8 text-emerald-500" />}
              title={items.length === 0 ? "All caught up" : "No matching alerts"}
              message={
                items.length === 0
                  ? "Zero pending alerts. FinTrack will notify you when spending limits, upcoming bills, or goal milestones need attention."
                  : "No notifications match your current search or category filter."
              }
              action={
                items.length === 0 ? (
                  <Link href="/dashboard">
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
                      Return to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear Filter
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const details = getNotifDetails(n);
              const IconComp = details.icon;

              return (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 group relative overflow-hidden ${
                    !n.isRead
                      ? "border-slate-200 dark:border-white/10 bg-white dark:border-emerald-500/20 dark:bg-[#15181d] border-l-4 border-l-emerald-500"
                      : "border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#15181d] hover:border-slate-300 dark:hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Themed Icon Badge */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs ${details.iconBg}`}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {n.title}
                        </h3>
                        <Badge tone={details.badgeColor}>{details.tagLabel}</Badge>
                        {!n.isRead && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#6c9818] dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        {n.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(n.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        {/* Action Link & Management */}
                        <div className="flex items-center gap-2">
                          {details.actionLink && (
                            <Link
                              href={details.actionLink}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#6c9818] hover:text-[#527511] dark:text-emerald-400 dark:hover:underline transition"
                            >
                              <span>{details.actionText}</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}

                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="rounded-lg px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-300 transition cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}

                          <button
                            onClick={() => deleteNotif(n.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Dismiss notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 5. Clear All Confirmation Modal ──────────────────── */}
        <ConfirmDialog
          open={confirmClear}
          onClose={() => setConfirmClear(false)}
          onConfirm={clearAll}
          title="Clear All Notifications?"
          message="Are you sure you want to dismiss all alerts? This action will remove all recorded notifications from your feed."
        />
      </div>
    </AppShell>
  );
}
