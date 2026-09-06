"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Wallet, Receipt, PiggyBank, BarChart3, Repeat, Sparkles, ArrowRight, Check,
  Moon, Sun, Code2, Menu, X,
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

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">FinTrack</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600">Features</a>
            <a href="#how" className="hover:text-indigo-600">How it works</a>
            <a href="#cta" className="hover:text-indigo-600">Get started</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={toggle} className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Sign In</Link>
            <Link href="/register" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95">Get Started</Link>
          </div>
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && (
          <div className="border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
            <div className="flex flex-col gap-2">
              <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Sign In</Link>
              <Link href="/register" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-semibold text-white">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(99,102,241,0.18),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(99,102,241,0.25),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Personal Finance, Simplified
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Take Control of <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Your Money</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
              Track your spending, manage budgets, reach your savings goals, and understand your financial habits — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition hover:opacity-95 active:scale-[0.98]">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded-2xl border border-slate-300 px-6 py-3.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                Sign In
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {["Free to start", "INR formatting", "Dark mode", "CSV export"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{t}</span>
              ))}
            </div>
          </div>

          {/* Hero mock dashboard */}
          <div className="animate-fade-up relative" style={{ animationDelay: "0.15s" }}>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(79,70,229,0.15)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Balance</p>
                  <p className="text-3xl font-extrabold">₹1,25,400</p>
                  <p className="text-xs font-bold text-emerald-600">▲ 12.4% this month</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Wallet className="h-6 w-6" /></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[["Income", "₹85,000", "text-emerald-600"], ["Expenses", "₹42,300", "text-rose-500"], ["Savings", "43.2%", "text-indigo-600"]].map(([l, v, c]) => (
                  <div key={l} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-[11px] font-medium text-slate-500">{l}</p>
                    <p className={`text-base font-extrabold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2.5">
                {[["Food", 80, "bg-amber-500", "₹4,000 / ₹5,000"], ["Shopping", 55, "bg-pink-500", "₹4,400 / ₹8,000"], ["Travel", 30, "bg-teal-500", "₹1,800 / ₹6,000"]].map(([n, p, bar, sub]) => (
                  <div key={n as string}>
                    <div className="mb-1 flex justify-between text-xs font-semibold"><span>{n}</span><span className="text-slate-500">{sub}</span></div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${bar}`} style={{ width: `${p}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-3 -top-3 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold text-emerald-600">Savings rate up!</p>
              <p className="text-[11px] text-slate-500">+6.2% vs last month</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Features</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">Everything you need to master money</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg`}><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200/70 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[["1", "Create your account", "Sign up free in under a minute."], ["2", "Add your transactions", "Log income & expenses with categories."], ["3", "Set budgets and savings goals", "Stay on track with live progress."], ["4", "Understand your finances", "Charts, reports & smart insights."]].map(([n, t, d]) => (
              <div key={n} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-extrabold text-white">{n}</div>
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-center text-white shadow-2xl sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_15rem_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
          <h2 className="relative text-3xl font-extrabold sm:text-4xl">Start managing your finances today.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-indigo-100">Join FinTrack and build healthier money habits with budgets, goals and insights.</p>
          <Link href="/register" className="relative mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-xl hover:bg-indigo-50">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer (hidden on mobile preview) */}
      <footer className="hidden md:block border-t border-slate-200 py-10 dark:border-slate-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Wallet className="h-4 w-4" /></div><span className="font-extrabold">FinTrack</span></div>
            <p className="mt-2 text-sm text-slate-500">Take Control of Your Money.</p>
          </div>
          <div><p className="text-sm font-bold">Product</p><div className="mt-2 space-y-1.5 text-sm text-slate-500"><a href="#features" className="block hover:text-indigo-600">Features</a><a href="#how" className="block hover:text-indigo-600">About</a><a href="#cta" className="block hover:text-indigo-600">Contact</a></div></div>
          <div><p className="text-sm font-bold">Legal</p><div className="mt-2 space-y-1.5 text-sm text-slate-500"><span className="block">Privacy</span><span className="block">Terms</span></div></div>
          <div><p className="text-sm font-bold">Connect</p><a href="https://github.com" className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><Code2 className="h-4 w-4" /> GitHub</a></div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">© 2026 Fintrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
