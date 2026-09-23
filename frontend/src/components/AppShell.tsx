"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, BarChart3,
  Repeat, FileText, Sparkles, Settings, Bell, Search, Menu, X,
  LogOut, Calendar, Landmark, Award, ChevronLeft, ChevronRight, Plus,
  ChevronDown, Sun, Moon, Tag,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Modal, Button, toast } from "@/components/ui";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";
import FinBotAssistant from "@/components/FinBotAssistant";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, getEstimatedRate, fetchLiveRates } from "@/lib/currency";
import { predictCategory } from "@/lib/categorizer";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/categories", icon: Tag, label: "Categories" },
  { href: "/budgets", icon: Wallet, label: "Budgets" },
  { href: "/goals", icon: Target, label: "Savings Goals" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/recurring", icon: Repeat, label: "Recurring" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/insights", icon: Sparkles, label: "Insights" },
  { href: "/achievements", icon: Award, label: "Achievements" },
];

const SECONDARY = [
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [currencyModal, setCurrencyModal] = useState<string | null>(null);
  const [switchingCurrency, setSwitchingCurrency] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Quick Add Modal State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    type: "expense" as "expense" | "income",
    amount: "",
    description: "",
    categoryName: "General",
    paymentMethod: "UPI",
    date: new Date().toISOString().slice(0, 10),
  });
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    fetchLiveRates().catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fintrack-sidebar-collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("fintrack-sidebar-collapsed", String(next));
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (!isInput && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setQuickAddOpen(true);
        return;
      }
      if (
        (e.key === "/" && !isInput) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    const handleOpenQuick = () => setQuickAddOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("fintrack-open-quick-add", handleOpenQuick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("fintrack-open-quick-add", handleOpenQuick);
    };
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.amount || !quickForm.description) return;
    setQuickSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(quickForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to create transaction");
      toast("Transaction logged successfully! ⚡");
      setQuickAddOpen(false);
      setQuickForm({
        type: "expense",
        amount: "",
        description: "",
        categoryName: "General",
        paymentMethod: "UPI",
        date: new Date().toISOString().slice(0, 10),
      });
      window.dispatchEvent(new CustomEvent("fintrack-transaction-created"));
      if (pathname === "/transactions" || pathname === "/dashboard") {
        window.location.reload();
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to add transaction", "error");
    } finally {
      setQuickSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setUnread(j.data.unread || 0))
      .catch(() => {});
    const t = setInterval(() => {
      fetch("/api/notifications", { credentials: "include" })
        .then((r) => r.json())
        .then((j) => j.success && setUnread(j.data.unread || 0))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, [user]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold shadow-xs">
            <Wallet className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold shadow-xs animate-pulse">
            <Wallet className="h-6 w-6 stroke-[2.5]" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const linkCls = (href: string, isSidebarCollapsed: boolean) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `group relative flex items-center ${isSidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"} rounded-xl text-sm transition-all duration-150 ${
      isActive
        ? "bg-slate-900 text-white font-semibold shadow-xs dark:bg-white/[0.08] dark:text-white dark:border dark:border-white/10"
        : "font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#181c22] dark:hover:text-white"
    }`;
  };

  const renderSidebar = (isSidebarCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-1 py-1`}>
        <Link href="/dashboard" className="flex items-center gap-2.5 group" title="FinTrack Dashboard">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white/[0.08] dark:border dark:border-white/10 shadow-xs group-hover:scale-105 transition-transform font-bold">
            <Wallet className="h-5 w-5 text-white dark:text-emerald-400" />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white">FinTrack</p>
                <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 px-1.5 py-0.5 text-[9px] font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">Financial Intelligence</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const isActive = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={linkCls(n.href, isSidebarCollapsed)}
              onClick={() => setMobileOpen(false)}
              title={isSidebarCollapsed ? n.label : undefined}
            >
              <n.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-white dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
              {!isSidebarCollapsed && <span className="flex-1 truncate">{n.label}</span>}
              {!isSidebarCollapsed && isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-emerald-400" />
              )}
            </Link>
          );
        })}
        <div className="my-3 border-t border-slate-200/80 dark:border-slate-800" />
        {SECONDARY.map((n) => {
          const isActive = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={linkCls(n.href, isSidebarCollapsed)}
              onClick={() => setMobileOpen(false)}
              title={isSidebarCollapsed ? n.label : undefined}
            >
              <div className="relative shrink-0">
                <n.icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-white dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
                {n.href === "/notifications" && unread > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              {!isSidebarCollapsed && <span className="flex-1 truncate">{n.label}</span>}
              {!isSidebarCollapsed && isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Desktop Toggle & Logout */}
      <div className="mt-auto border-t border-slate-200/80 pt-3 dark:border-slate-800">
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex w-full items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white cursor-pointer transition`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {!isSidebarCollapsed && <span>Collapse Sidebar</span>}
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <button
          onClick={() => {
            setMobileOpen(false);
            logout();
          }}
          className={`mt-2 flex w-full items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3.5"} rounded-xl py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer transition`}
          title={isSidebarCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!isSidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 hidden transition-all duration-300 border-r border-slate-200/80 bg-white/95 p-4 lg:block dark:border-white/[0.08] dark:bg-[#121519]/95 backdrop-blur-md z-40 shadow-xs ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-white p-4 dark:bg-[#15181d] dark:border-r dark:border-white/[0.08] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebar(false)}
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"}`}>
        {/* Top navbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 dark:border-white/[0.08] dark:bg-[#121519]/80 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-2.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white/[0.08] dark:border dark:border-white/10 font-bold text-xs shadow-xs">
                <span className="text-white dark:text-emerald-400">F</span>
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">FinTrack</span>
            </div>

            {/* Quick Search with shortcut */}
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3 py-1.5 text-sm text-slate-600 md:flex dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-400 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-[#1a1e24] focus-within:ring-2 focus-within:ring-emerald-500/20 transition shadow-2xs">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                placeholder="Search transactions..."
                className="w-56 bg-transparent outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/transactions?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }}
              />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                /
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {/* Quick Add Button with N shortcut (hidden on mobile, bottom bar has center +) */}
              <button
                onClick={() => setQuickAddOpen(true)}
                className="hidden sm:flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                title="Quick Add Transaction (Press N)"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New</span>
                <kbd className="hidden md:inline rounded bg-black/10 px-1 py-0.2 text-[9px] font-bold">N</kbd>
              </button>

              {/* Quick Currency Selector */}
              <div className="relative" ref={currencyMenuRef}>
                <button
                  onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-200 dark:hover:bg-[#20252e] transition cursor-pointer shadow-2xs"
                  title="Active Currency (Click to switch)"
                >
                  <span className="text-slate-900 dark:text-white font-bold">{CURRENCY_SYMBOLS[user.currency || "INR"] || "₹"}</span>
                  <span>{user.currency || "INR"}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {currencyMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl dark:border-white/[0.08] dark:bg-[#15181d] z-50 animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/[0.08]">
                      Switch Currency
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {SUPPORTED_CURRENCIES.map((c) => {
                        const isCurrent = (user.currency || "INR") === c.code;
                        return (
                          <button
                            key={c.code}
                            onClick={() => {
                              setCurrencyMenuOpen(false);
                              if (!isCurrent) setCurrencyModal(c.code);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                              isCurrent
                                ? "bg-slate-100 text-slate-900 dark:bg-emerald-500/15 dark:text-emerald-400 font-semibold"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#20252e]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{c.symbol}</span>
                              <span>{c.code}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">{c.name.split(" ")[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Mode Switcher */}
              <button
                onClick={toggle}
                className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-300 dark:hover:bg-[#20252e] cursor-pointer transition shadow-2xs"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
              </button>

              <Link
                href="/notifications"
                className="relative rounded-xl border border-slate-200/90 bg-slate-50/90 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-300 dark:hover:bg-[#20252e] transition shadow-2xs"
              >
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-white/[0.08] mx-1" />

              <Link href="/settings" className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/90 p-1 pr-2.5 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#181c22] dark:hover:bg-[#20252e] transition shadow-2xs">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover shadow-xs border border-slate-200 dark:border-white/10 shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white/[0.08] dark:border dark:border-white/10 text-xs font-bold shadow-xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="max-w-32 truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
                  <p className="max-w-32 truncate text-[11px] text-slate-500 leading-tight">{user.email}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-3.5 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-10">{children}</main>
        <OnboardingModal />
        <SessionTimeoutModal />

        {/* Currency Switch Confirmation Modal */}
        {currencyModal && (
          <Modal
            open={Boolean(currencyModal)}
            onClose={() => setCurrencyModal(null)}
            title={`Convert Currency to ${currencyModal}?`}
          >
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-emerald-400">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Real-time Financial Value Conversion</span>
                </div>
                <p className="mt-2 leading-relaxed text-xs text-slate-600 dark:text-slate-300">
                  Switching your active currency from <strong>{user.currency || "INR"}</strong> to <strong>{currencyModal}</strong> will automatically convert all your existing financial records:
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>Bank & cash account balances</li>
                  <li>All transaction income and expense records</li>
                  <li>Configured monthly budgets</li>
                  <li>Savings goals target and accumulated amounts</li>
                  <li>Recurring bills and subscription commitments</li>
                </ul>
                <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-emerald-400">
                  <span>Exchange Rate:</span>
                  <span>1 {user.currency || "INR"} ≈ {getEstimatedRate(user.currency || "INR", currencyModal).toFixed(4)} {currencyModal}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrencyModal(null)}
                  disabled={switchingCurrency}
                  className="h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setSwitchingCurrency(true);
                    try {
                      const res = await fetch("/api/auth/profile", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ currency: currencyModal }),
                      });
                      const json = await res.json();
                      if (!json.success) throw new Error(json.message);
                      toast(`Switched currency to ${currencyModal}! All amounts converted. 💱`);
                      setCurrencyModal(null);
                      window.location.reload();
                    } catch (err: unknown) {
                      toast(err instanceof Error ? err.message : "Failed to convert currency", "error");
                    } finally {
                      setSwitchingCurrency(false);
                    }
                  }}
                  loading={switchingCurrency}
                  className="h-9 px-4 text-xs font-bold cursor-pointer"
                >
                  Convert & Switch
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Quick Add Transaction Modal */}
        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick Log Transaction">
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setQuickForm({ ...quickForm, type: "expense" })}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  quickForm.type === "expense"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setQuickForm({ ...quickForm, type: "income" })}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  quickForm.type === "income"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Income
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({CURRENCY_SYMBOLS[user.currency || "INR"] || user.currency || "₹"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={quickForm.amount}
                onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                required
                value={quickForm.description}
                onChange={(e) => {
                  const val = e.target.value;
                  const pred = predictCategory(val);
                  setQuickForm((prev) => ({
                    ...prev,
                    description: val,
                    categoryName: pred.confidence >= 0.7 ? pred.category : prev.categoryName,
                    type: pred.confidence >= 0.8 ? pred.type : prev.type,
                  }));
                }}
                placeholder="e.g. Coffee, Freelance invoice, Groceries"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={quickForm.categoryName}
                  onChange={(e) => setQuickForm({ ...quickForm, categoryName: e.target.value })}
                  placeholder="Category"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={quickForm.paymentMethod}
                  onChange={(e) => setQuickForm({ ...quickForm, paymentMethod: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={quickSaving}>
                Save Transaction
              </Button>
            </div>
          </form>
        </Modal>

        {/* FinBot AI Autonomous Financial Copilot */}
        <FinBotAssistant />

        {/* Mobile bottom nav with Center Quick-Add Action */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden dark:border-white/[0.08] dark:bg-[#121519]/95 shadow-[0_-4px_24px_rgba(0,0,0,0.25)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="grid grid-cols-5 items-center px-1.5 py-1">
            {/* 1. Home */}
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                pathname === "/dashboard"
                  ? "text-slate-900 dark:text-emerald-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <LayoutDashboard className="h-5 w-5" />
                {pathname === "/dashboard" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-900 dark:bg-emerald-400" />
                )}
              </div>
              <span className="leading-tight text-[10px]">Home</span>
            </Link>

            {/* 2. Transactions */}
            <Link
              href="/transactions"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                pathname.startsWith("/transactions")
                  ? "text-slate-900 dark:text-emerald-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <ArrowLeftRight className="h-5 w-5" />
                {pathname.startsWith("/transactions") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-900 dark:bg-emerald-400" />
                )}
              </div>
              <span className="leading-tight text-[10px]">Txns</span>
            </Link>

            {/* 3. Center Elevated Quick Add Button */}
            <div className="flex justify-center -mt-5">
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md ring-4 ring-white dark:ring-[#0b0e11] active:scale-90 transition-all cursor-pointer"
                aria-label="Quick Add Transaction"
              >
                <Plus className="h-6 w-6 stroke-[2.5] group-active:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* 4. Budgets */}
            <Link
              href="/budgets"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                pathname.startsWith("/budgets")
                  ? "text-slate-900 dark:text-emerald-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Wallet className="h-5 w-5" />
                {pathname.startsWith("/budgets") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-900 dark:bg-emerald-400" />
                )}
              </div>
              <span className="leading-tight text-[10px]">Budgets</span>
            </Link>

            {/* 5. Analytics */}
            <Link
              href="/analytics"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                pathname.startsWith("/analytics")
                  ? "text-slate-900 dark:text-emerald-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <BarChart3 className="h-5 w-5" />
                {pathname.startsWith("/analytics") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-900 dark:bg-emerald-400" />
                )}
              </div>
              <span className="leading-tight text-[10px]">Analytics</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
