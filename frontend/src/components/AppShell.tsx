"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, BarChart3,
  Repeat, FileText, Sparkles, Settings, Bell, Search, Menu, X,
  LogOut, Sun, Moon, Calendar, Landmark, Award, ChevronLeft, ChevronRight, Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/budgets", icon: Wallet, label: "Budgets" },
  { href: "/goals", icon: Target, label: "Savings Goals" },
  { href: "/achievements", icon: Award, label: "Achievements" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/recurring", icon: Repeat, label: "Recurring" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/insights", icon: Sparkles, label: "Insights" },
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
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
      if (
        (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.classList.toggle("dark", (localStorage.getItem("fintrack-theme") || user.theme) === "dark");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const linkCls = (href: string, isSidebarCollapsed: boolean) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `flex items-center ${isSidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-medium transition-all ${
      isActive
        ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/20"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
    }`;
  };

  const renderSidebar = (isSidebarCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-1 py-1`}>
        <Link href="/dashboard" className="flex items-center gap-2.5" title="FinTrack Dashboard">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Wallet className="h-5 w-5" />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">FinTrack</p>
              <p className="text-[11px] font-medium text-slate-500">Take Control of Your Money</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={linkCls(n.href, isSidebarCollapsed)}
            onClick={() => setMobileOpen(false)}
            title={isSidebarCollapsed ? n.label : undefined}
          >
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            {!isSidebarCollapsed && <span>{n.label}</span>}
          </Link>
        ))}
        <div className="my-3 border-t border-slate-200/80 dark:border-slate-800" />
        {SECONDARY.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={linkCls(n.href, isSidebarCollapsed)}
            onClick={() => setMobileOpen(false)}
            title={isSidebarCollapsed ? n.label : undefined}
          >
            <div className="relative shrink-0">
              <n.icon className="h-[18px] w-[18px]" />
              {n.href === "/notifications" && unread > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && <span>{n.label}</span>}
          </Link>
        ))}
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 transition-colors">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 hidden transition-all duration-300 border-r border-slate-200/80 bg-white p-4 lg:block dark:border-slate-800/80 dark:bg-[#111827] z-40 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-white p-4 dark:bg-[#111827] shadow-2xl">
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
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#111827]/90">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Search with shortcut */}
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-500 md:flex dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                placeholder="Search transactions..."
                className="w-56 bg-transparent outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/transactions?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }}
              />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                /
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-2">

              <button
                onClick={toggle}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer transition"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              <Link
                href="/notifications"
                className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <Link href="/settings" className="flex items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="max-w-32 truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
                  <p className="max-w-32 truncate text-[11px] text-slate-500 leading-tight">{user.email}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-10">{children}</main>
        <OnboardingModal />
        <SessionTimeoutModal />

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden dark:border-slate-800/80 dark:bg-[#111827]/95">
          <div className="grid grid-cols-5 px-2 py-1.5">
            {[
              { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
              { href: "/transactions", icon: ArrowLeftRight, label: "Txns" },
              { href: "/budgets", icon: Wallet, label: "Budget" },
              { href: "/analytics", icon: BarChart3, label: "Stats" },
              { href: "/settings", icon: Settings, label: "More" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition ${
                  pathname === n.href ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
