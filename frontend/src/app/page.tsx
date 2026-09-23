"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Wallet, Receipt, PiggyBank, BarChart3, Repeat, Sparkles, ArrowRight, Check,
  Code2, Menu, X, Sun, Moon, CreditCard, Bot, Zap, ArrowDownLeft, ArrowUpRight, ShieldCheck, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const FEATURES = [
  { icon: Receipt, title: "Expense Tracking", desc: "Log income & expenses in seconds with smart categories, search, filters and payment methods.", color: "from-indigo-500 to-blue-500" },
  { icon: Wallet, title: "Smart Budgets", desc: "Monthly budgets per category with live progress, warnings and over-budget alerts.", color: "from-emerald-500 to-teal-500" },
  { icon: PiggyBank, title: "Savings Goals", desc: "Emergency funds, gadgets, vacations — track progress and required monthly contributions.", color: "from-amber-500 to-orange-500" },
  { icon: BarChart3, title: "Financial Analytics", desc: "Income vs expenses, category breakdowns, savings rate, cash-flow and monthly comparisons.", color: "from-violet-500 to-purple-500" },
  { icon: Repeat, title: "Recurring Payments", desc: "Rent, salary, subscriptions — never miss a payment with upcoming due-date tracking.", color: "from-rose-500 to-pink-500" },
  { icon: Sparkles, title: "Financial Insights", desc: "Automatic observations from your real data — trends, milestones and gentle nudges.", color: "from-sky-500 to-cyan-500" },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "cards" | "budgets" | "ai">("overview");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 transition-colors duration-300">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-2xs dark:border-slate-800/80 dark:bg-[#111827]/85 transition-colors duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/25">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">FinTrack</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Features</a>
            <a href="#how" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">How it works</a>
            <a href="#cta" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Get started</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={toggle}
              className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
            </button>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 transition"
            >
              Get Started
            </Link>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggle}
              className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
            </button>
            <button
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(99,102,241,0.12),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(99,102,241,0.2),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Personal Finance, Simplified
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem] text-slate-900 dark:text-white">
              Take Control of <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Your Money</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
              Track your spending, manage budgets, reach your savings goals, and understand your financial habits — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition active:scale-[0.98]">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-2xs">
                Sign In
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {["Free to start", "INR default formatting", "Smart alerts", "Instant reports"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{t}</span>
              ))}
            </div>
          </div>

          {/* Interactive Hero Showcase */}
          <div className="animate-fade-up relative" style={{ animationDelay: "0.15s" }}>
            {/* Interactive Feature Tabs */}
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-slate-200/90 bg-white/80 p-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md">
              {[
                { id: "overview", label: "Live Cashflow", icon: BarChart3 },
                { id: "cards", label: "Mercury Cards", icon: CreditCard },
                { id: "budgets", label: "Smart Budgets", icon: Wallet },
                { id: "ai", label: "FinBot AI", icon: Bot },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Main Interactive Showcase Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-slate-800/90 dark:bg-[#111827] transition-all min-h-[340px] flex flex-col justify-between">
              {activeTab === "overview" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Liquid Net Worth</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹1,25,400</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ▲ 12.4% cashflow surge this month
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      ["Income", "₹85,000", "text-emerald-600 dark:text-emerald-400", "+₹12k vs Oct"],
                      ["Expenses", "₹42,300", "text-rose-500 dark:text-rose-400", "42 transactions"],
                      ["Savings", "50.2%", "text-indigo-600 dark:text-indigo-400", "Top 5% quartile"],
                    ].map(([l, v, c, sub]) => (
                      <div key={l} className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800/60">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{l}</p>
                        <p className={`text-base font-black ${c}`}>{v}</p>
                        <p className="text-[9px] text-slate-400 truncate">{sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Live Activity</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Tech Consultancy Fee</span>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">+₹75,000</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">AWS Cloud Hosting</span>
                      </div>
                      <span className="font-black text-rose-600 dark:text-rose-400">−₹3,240</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "cards" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-[#0e172a] to-indigo-950 p-5 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-400/30">
                          <Wallet className="h-4 w-4 text-indigo-400" />
                        </div>
                        <span className="text-xs font-black tracking-wider text-indigo-300">FINTRACK INSTITUTIONAL</span>
                      </div>
                      <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-300 border border-indigo-500/30">
                        PRIMARY WALLET
                      </span>
                    </div>

                    <div className="mt-5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">Available Balance</span>
                      <p className="text-2xl font-black tabular-nums tracking-tight">₹2,45,000.00</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-300">
                      <span>•••• •••• •••• 8821</span>
                      <span className="text-[11px] text-slate-400 font-sans">EXP 08/29</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      FDIC-Equivalent Reserve Backed
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">1-Click Mask/Reveal</span>
                  </div>
                </div>
              )}

              {activeTab === "budgets" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Budget Caps</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">Active Allocation Tracker</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Healthy · 78% utilized
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {[
                      { name: "Food & Groceries", spent: 4000, limit: 5000, pct: 80, bar: "bg-indigo-500" },
                      { name: "Retail & Shopping", spent: 4400, limit: 5000, pct: 88, bar: "bg-amber-500" },
                      { name: "Tech & SaaS", spent: 2900, limit: 3000, pct: 97, bar: "bg-rose-500" },
                    ].map((b) => (
                      <div key={b.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-800 dark:text-slate-200">{b.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()} ({b.pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${b.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
                    ⚡ Auto-alerts triggered at 80% & 100% threshold marks
                  </p>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">FinBot Autonomous Intelligence</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Live Heuristic Financial Engine</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-indigo-50/70 p-3 text-xs leading-relaxed text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-200/50 dark:border-indigo-500/20">
                    <p className="font-semibold">💡 Real-Time Financial Advisory:</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      "Your burn rate is <strong>14% lower</strong> than last month! You have 2 recurring bills due in 4 days totaling <strong>₹1,448</strong>. Your projected end-of-month surplus is <strong>₹42,700</strong>."
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      ✓ Auto-Debits Scheduled
                    </span>
                    <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      🎯 On Track for Vacation Goal
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle floating badge */}
            <div className="absolute -right-3 -top-3 hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-lg sm:block dark:border-slate-700 dark:bg-[#111827]">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> High Precision Data
              </p>
              <p className="text-[10px] text-slate-400">Instant Local Processing</p>
            </div>
          </div>
        </div>

        {/* Institutional Trust Badges Strip */}
        <div className="border-y border-slate-200/80 bg-white/60 py-4 dark:border-slate-800/80 dark:bg-[#0c121e]/60 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Bank-Grade AES-256 Security
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-500" /> Zero 3rd-Party Trackers
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Embedded PGlite Database
            </span>
            <span className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-violet-500" /> Autonomous FinBot Copilot
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Features</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Everything you need to master money</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-slate-200/90 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800/80 dark:bg-[#111827]">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-sm`}><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200/80 bg-slate-50 py-14 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[["1", "Create your account", "Sign up free in under a minute."], ["2", "Add your transactions", "Log income & expenses with categories."], ["3", "Set budgets and savings goals", "Stay on track with live progress."], ["4", "Understand your finances", "Charts, reports & smart insights."]].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800/80 dark:bg-[#111827]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-extrabold text-white">{n}</div>
                <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{t}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-10 text-center text-white shadow-xl sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_15rem_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
          <h2 className="relative text-3xl font-extrabold sm:text-4xl">Start managing your finances today.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-indigo-100">Join FinTrack and build healthier money habits with budgets, goals and insights.</p>
          <Link href="/register" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-indigo-600 shadow-lg hover:bg-indigo-50 transition">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="hidden md:block border-t border-slate-200/80 bg-white py-10 dark:border-slate-800/80 dark:bg-[#0b0f19]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-2xs">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white">FinTrack</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Take Control of Your Money.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Product</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <a href="#features" className="block hover:text-indigo-600 dark:hover:text-indigo-400">Features</a>
              <a href="#how" className="block hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
              <a href="#cta" className="block hover:text-indigo-600 dark:hover:text-indigo-400">Contact</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Legal</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="block">Privacy</span>
              <span className="block">Terms</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Connect</p>
            <a href="https://github.com" className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              <Code2 className="h-4 w-4" /> GitHub
            </a>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">© 2026 Fintrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
