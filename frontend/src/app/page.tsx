"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Wallet, Receipt, PiggyBank, BarChart3, Repeat, Sparkles, ArrowRight, Check,
  Code2, Menu, X, Sun, Moon, Bot, Zap, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, Lock, TrendingUp, Target, Bell, Star, ChevronDown, Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const FEATURES = [
  { icon: Receipt,   title: "Expense Tracking",   desc: "Log income & expenses in seconds with smart categories, search, filters and payment methods.", color: "from-indigo-500 to-blue-500",    glow: "shadow-indigo-500/30" },
  { icon: Wallet,    title: "Smart Budgets",       desc: "Monthly budgets per category with live progress, warnings and over-budget alerts.",           color: "from-emerald-500 to-teal-500",  glow: "shadow-emerald-500/30" },
  { icon: PiggyBank, title: "Savings Goals",       desc: "Emergency funds, gadgets, vacations — track progress and required monthly contributions.",     color: "from-amber-500 to-orange-500",  glow: "shadow-amber-500/30" },
  { icon: BarChart3, title: "Financial Analytics", desc: "Income vs expenses, category breakdowns, savings rate, cash-flow and monthly comparisons.",    color: "from-violet-500 to-purple-500", glow: "shadow-violet-500/30" },
  { icon: Repeat,    title: "Recurring Payments",  desc: "Rent, salary, subscriptions — never miss a payment with upcoming due-date tracking.",          color: "from-rose-500 to-pink-500",     glow: "shadow-rose-500/30" },
  { icon: Sparkles,  title: "Financial Insights",  desc: "Automatic observations from your real data — trends, milestones and gentle nudges.",            color: "from-sky-500 to-cyan-500",      glow: "shadow-sky-500/30" },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0b0e11] dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">

      {/* Nav */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-sm dark:border-white/[0.08] dark:bg-[#0b0e11]/90"
          : "bg-transparent"
      }`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bbf246] text-[#0b0e11] font-black shadow-md shadow-[#bbf246]/30">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">FinTrack</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-[#bbf246] transition">Features</a>
            <a href="#how"      className="hover:text-indigo-600 dark:hover:text-[#bbf246] transition">How it works</a>
            <a href="#cta"      className="hover:text-indigo-600 dark:hover:text-[#bbf246] transition">Get started</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={toggle} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 transition cursor-pointer" title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}>
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
            <Link href="/login"    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800 transition">Sign In</Link>
            <Link href="/register" className="rounded-full bg-[#bbf246] hover:bg-[#a8e030] px-5 py-2 text-sm font-black text-[#0b0e11] shadow-md shadow-[#bbf246]/25 transition active:scale-[0.97]">Get Started</Link>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={toggle} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 transition cursor-pointer">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
            <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setMenu(!menu)}>
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-white/[0.08] dark:bg-[#15181d]">
            <div className="flex flex-col gap-2">
              <Link href="/login"    className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Sign In</Link>
              <Link href="/register" className="rounded-full bg-[#bbf246] px-3 py-2 text-sm font-black text-[#0b0e11] text-center">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-12 sm:pb-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] sm:h-[700px] sm:w-[700px] rounded-full bg-gradient-to-br from-[#bbf246]/10 via-[#bbf246]/5 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-60 -left-40 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-gradient-to-br from-emerald-400/8 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "1s" }} />
          <div className="absolute bottom-0 right-1/3 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-gradient-to-br from-[#bbf246]/5 to-transparent blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:pt-6">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:border-white/[0.08] dark:bg-[#15181d] dark:text-[#bbf246] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#bbf246] animate-pulse" /> Personal Finance, Simplified
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.5rem]">
              Take Control of{" "}
              <span className="bg-gradient-to-r from-[#bbf246] via-[#d4ff70] to-[#bbf246] bg-clip-text text-transparent">Your Money</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg mx-auto max-w-lg lg:mx-0">
              Track your spending, manage budgets, reach your savings goals, and understand your financial habits — all in one place.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#bbf246] hover:bg-[#a8e030] px-7 py-3.5 text-sm font-black text-[#0b0e11] shadow-lg shadow-[#bbf246]/20 transition-all duration-200 active:scale-[0.97]">
                Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 stroke-[2.5]" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#181c22] dark:text-slate-200 dark:hover:bg-[#20252e] shadow-sm transition-all duration-200 active:scale-[0.97]">
                Sign In
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:justify-center lg:justify-start">
              {["Free to start", "INR formatting", "Smart alerts", "Instant reports"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#bbf246]/20 dark:bg-[#bbf246]/15">
                    <Check className="h-2.5 w-2.5 text-[#0b0e11] dark:text-[#bbf246] stroke-[3]" />
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: static dashboard preview — desktop only */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#bbf246]/10 via-[#bbf246]/5 to-transparent blur-2xl" />
            <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#15181d]">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">November 2026 · Net Worth</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">₹1,25,400</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-[#bbf246] flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" /> +12.4% this month
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#bbf246] text-[#0b0e11] font-black shadow-lg shadow-[#bbf246]/25">
                  <Wallet className="h-5 w-5 stroke-[2.5]" />
                </div>
              </div>

              {/* 3 stat pills */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  ["Income",   "₹85,000", "text-emerald-600 dark:text-[#bbf246]", "bg-emerald-50 dark:bg-[#bbf246]/10"],
                  ["Expenses", "₹42,300", "text-rose-500 dark:text-[#ff6347]",       "bg-rose-50 dark:bg-rose-950/30"],
                  ["Savings",  "50.2%",   "text-slate-900 dark:text-white",         "bg-slate-50 dark:bg-[#1b1f26]"],
                ].map(([l, v, c, bg]) => (
                  <div key={l} className={`rounded-xl ${bg} p-2.5`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{l}</p>
                    <p className={`text-base font-black ${c}`}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Budget bars */}
              <div className="mb-4 space-y-2.5 border-t border-slate-100 dark:border-white/[0.06] pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget Usage</p>
                {[
                  { name: "Food",     pct: 80, bar: "bg-[#bbf246]" },
                  { name: "Shopping", pct: 88, bar: "bg-amber-400" },
                  { name: "Tech",     pct: 97, bar: "bg-rose-500" },
                ].map((b) => (
                  <div key={b.name}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{b.name}</span>
                      <span className="text-slate-400">{b.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent transactions */}
              <div className="space-y-2 border-t border-slate-100 dark:border-white/[0.06] pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Activity</p>
                {[
                  { label: "Tech Consultancy Fee", amt: "+₹75,000", inc: true },
                  { label: "AWS Cloud Hosting",    amt: "−₹3,240",  inc: false },
                  { label: "Swiggy Delivery",      amt: "−₹340",    inc: false },
                ].map((tx) => (
                  <div key={tx.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tx.inc ? "bg-[#bbf246]/15 text-[#bbf246]" : "bg-rose-500/10 text-[#ff6347]"}`}>
                        {tx.inc ? <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" /> : <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{tx.label}</span>
                    </div>
                    <span className={`text-xs font-black ${tx.inc ? "text-[#bbf246]" : "text-slate-900 dark:text-white"}`}>{tx.amt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 -top-4 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#15181d]/95">
              <p className="text-xs font-bold text-emerald-600 dark:text-[#bbf246] flex items-center gap-1"><Check className="h-3.5 w-3.5 stroke-[2.5]" /> High Precision Data</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Instant Local Processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile App Preview — shown only on mobile ─────────────────────── */}
      <section className="md:hidden px-4 pb-10 space-y-4">

        {/* Mini dashboard card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg dark:border-white/[0.08] dark:bg-[#15181d]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">November 2026</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₹1,25,400</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-[#bbf246] flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" /> +12.4% this month
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#bbf246] text-[#0b0e11] font-black shadow-md shadow-[#bbf246]/25">
              <Wallet className="h-5 w-5 stroke-[2.5]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              ["Income",   "₹85K",  "text-emerald-600 dark:text-[#bbf246]", "bg-emerald-50 dark:bg-[#bbf246]/10"],
              ["Expenses", "₹42K",  "text-rose-500 dark:text-[#ff6347]",       "bg-rose-50 dark:bg-rose-950/40"],
              ["Savings",  "50.2%", "text-slate-900 dark:text-white",         "bg-slate-50 dark:bg-[#1b1f26]"],
            ].map(([l, v, c, bg]) => (
              <div key={l} className={`rounded-xl ${bg} p-2.5 text-center`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{l}</p>
                <p className={`text-sm font-black ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Transactions</p>
            {[
              { label: "Tech Consultancy", cat: "Income",   amt: "+₹75,000", inc: true },
              { label: "AWS Hosting",      cat: "Tech",     amt: "−₹3,240",  inc: false },
              { label: "Swiggy",           cat: "Food",     amt: "−₹340",    inc: false },
            ].map((tx) => (
              <div key={tx.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tx.inc ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
                    {tx.inc ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{tx.label}</p>
                    <p className="text-[10px] text-slate-400">{tx.cat}</p>
                  </div>
                </div>
                <span className={`text-xs font-black ${tx.inc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{tx.amt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget progress card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Monthly Budgets</p>
            <span className="rounded-full bg-[#bbf246]/15 px-2.5 py-1 text-[11px] font-bold text-[#0b0e11] dark:text-[#bbf246] border border-[#bbf246]/30">Healthy</span>
          </div>
          <div className="space-y-3">
            {[
              { name: "Food & Groceries",  spent: 4000, limit: 5000, pct: 80, bar: "bg-[#bbf246]" },
              { name: "Retail & Shopping", spent: 4400, limit: 5000, pct: 88, bar: "bg-amber-400" },
              { name: "Tech & SaaS",       spent: 2900, limit: 3000, pct: 97, bar: "bg-rose-500" },
            ].map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">{b.name}</span>
                  <span className="text-slate-400">₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${b.bar} transition-all`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Receipt,   title: "Expense Log",      desc: "Log in seconds",           color: "from-[#bbf246] to-emerald-400",  bg: "bg-slate-50/70 dark:bg-[#1b1f26]" },
            { icon: PiggyBank, title: "Savings Goals",    desc: "Track progress",           color: "from-amber-400 to-orange-400",  bg: "bg-slate-50/70 dark:bg-[#1b1f26]" },
            { icon: Bell,      title: "Smart Alerts",     desc: "Budget warnings",          color: "from-rose-500 to-pink-500",     bg: "bg-slate-50/70 dark:bg-[#1b1f26]" },
            { icon: BarChart3, title: "Analytics",        desc: "Visual insights",          color: "from-emerald-400 to-teal-500",   bg: "bg-slate-50/70 dark:bg-[#1b1f26]" },
          ].map((f) => (
            <div key={f.title} className={`rounded-2xl border border-slate-200/90 ${f.bg} p-4 dark:border-white/[0.06]`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-slate-900 shadow-sm mb-2 font-black`}>
                <f.icon className="h-4 w-4 stroke-[2.5]" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{f.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Recurring bills preview */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Bills</p>
            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">2 due soon</span>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Netflix",     date: "Oct 1",  amt: "₹649",   days: 3 },
              { name: "AWS",         date: "Oct 3",  amt: "₹3,240", days: 5 },
              { name: "Gym Membership", date: "Oct 5", amt: "₹999", days: 7 },
            ].map((b) => (
              <div key={b.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#20252e]">
                    <Repeat className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{b.name}</p>
                    <p className="text-[10px] text-slate-400">{b.date} · in {b.days} days</p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{b.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip (Unified Theme) */}
      <div className="border-y border-slate-200/80 bg-white/50 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#121519] py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
            {[
              { label: "Transactions tracked", val: "2M", suff: "+" },
              { label: "Active users",          val: "50K", suff: "+" },
              { label: "Avg. savings boost",    val: "₹18K", suff: "" },
              { label: "Uptime",                val: "99.9", suff: "%" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  <span>{s.val}</span>
                  <span className="text-[#bbf246]">{s.suff}</span>
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#121519] py-5">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-10 sm:gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 shrink-0 text-[#bbf246]" /> Bank-Grade AES-256</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 shrink-0 text-[#bbf246]" /> Zero 3rd-Party Trackers</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 shrink-0 text-amber-500" /> Embedded PGlite DB</span>
            <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 shrink-0 text-[#bbf246]" /> FinBot Copilot</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-20 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[#bbf246]">Features</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
            Everything you need to{" "}
            <span className="text-slate-900 dark:text-[#bbf246]">master money</span>
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">From daily expense logging to long-term goal tracking — every tool your financial life needs.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:shadow-xl dark:border-white/[0.08] dark:bg-[#15181d]">
              <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg ${f.glow}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#121519] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[#bbf246] mb-6 sm:mb-8">What users say</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: "Priya S.",  role: "Freelance Designer",  quote: "FinTrack transformed how I manage irregular income. Recurring payments alone saved me ₹8,000 in missed bills.", stars: 5 },
              { name: "Arjun M.", role: "Software Engineer",    quote: "The financial runway metric is genius. Knowing exactly how many months my savings last gives real peace of mind.", stars: 5 },
              { name: "Sneha R.", role: "Small Business Owner", quote: "CSV import made onboarding instant. Had 6 months of bank data in the app in under 5 minutes. Incredible.", stars: 5 },
            ].map((r) => (
              <div key={r.name} className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d]">
                <div className="flex gap-0.5 mb-3">{Array.from({ length: r.stars }).map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}</div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">"{r.quote}"</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#bbf246] text-xs font-black text-[#0b0e11]">{r.name[0]}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{r.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[#bbf246]">Process</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">How it works</h2>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              { n: "1", icon: Sparkles,  t: "Create account",          d: "Sign up free in under a minute, no card required." },
              { n: "2", icon: Receipt,   t: "Add transactions",         d: "Log income & expenses with smart auto-categorization." },
              { n: "3", icon: Target,    t: "Set goals & budgets",      d: "Stay on track with live progress and smart alerts." },
              { n: "4", icon: BarChart3, t: "Understand your finances", d: "Charts, reports & AI-powered insights." },
            ].map(({ n, icon: Icon, t, d }) => (
              <div key={n} className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#15181d] text-center hover:-translate-y-1 transition-transform duration-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#bbf246] text-[#0b0e11] font-black shadow-md shadow-[#bbf246]/20">
                  <Icon className="h-5 w-5 stroke-[2.5]" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{t}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA (Unified Theme) */}
      <section id="cta" className="mx-auto max-w-6xl px-4 py-10 sm:py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-[#121519] to-[#15181d] dark:border-white/[0.08] dark:from-[#15181d] dark:via-[#121519] dark:to-[#0b0e11] p-8 text-center text-white shadow-2xl sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute inset-0">
            {/* Subtle Neon Lime Glow matching brand theme */}
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#bbf246]/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#bbf246]/5 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(187,242,70,0.08),transparent)]" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black sm:text-3xl lg:text-4xl leading-tight text-white tracking-tight">
              Start managing your<br className="hidden sm:inline" /> finances today.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-400 text-sm sm:text-base leading-relaxed">
              Join FinTrack and build healthier money habits with budgets, goals and smart insights.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#bbf246] hover:bg-[#a8e030] px-8 py-3.5 text-sm font-black text-[#0b0e11] shadow-lg shadow-[#bbf246]/25 transition-all duration-200 active:scale-[0.97]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 stroke-[2.5]" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-8 py-3.5 text-sm font-bold text-white hover:bg-white/[0.15] dark:hover:bg-[#1b1f26] transition active:scale-[0.97]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Upper Reference Design) */}
      <footer className="border-t border-slate-200/80 bg-white py-12 sm:py-16 dark:border-white/[0.08] dark:bg-[#0b0e11] transition-colors">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Centered Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#bbf246] text-[#0b0e11] font-black shadow-sm shadow-[#bbf246]/20">
              <Wallet className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              FinTrack
            </span>
          </div>

          {/* Centered Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10 sm:mb-14 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/privacy#security" className="hover:text-slate-900 dark:hover:text-white transition">
              Security
            </Link>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition">
              Sitemap
            </a>
          </div>

          {/* Bottom Bar: Language Selector | Social Icons | Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 pt-2 text-xs text-slate-400 dark:text-slate-500">
            {/* Language Selector */}
            <div className="relative order-2 sm:order-1">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition select-none"
              >
                <span>{selectedLang}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {langOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/[0.08] dark:bg-[#15181d] z-20">
                  {["English", "हिन्दी (Hindi)"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang.split(" ")[0]);
                        setLangOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social Icons */}
            <div className="order-1 sm:order-2 flex items-center justify-center gap-6">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="#hero"
                aria-label="Website"
                className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition"
              >
                <Globe className="h-4 w-4 stroke-[1.8]" />
              </a>
            </div>

            {/* Copyright */}
            <div className="order-3 text-center sm:text-right">
              © {new Date().getFullYear()} FinTrack. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
