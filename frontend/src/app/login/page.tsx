"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Wallet, Eye, EyeOff, Clock, ArrowRight, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    setEmail("");
    setPassword("");
    if (formRef.current) formRef.current.reset();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "timeout" || reason === "exit_timeout") setIsTimeout(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0b0e11] overflow-hidden">

      {/* Left decorative panel (Desktop) */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between overflow-hidden bg-[#111419] border-r border-slate-200 dark:border-white/[0.08] p-10 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-slate-50 dark:bg-white/[0.04] blur-2xl" />
        </div>

        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold shadow-lg shadow-xs">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">FinTrack</span>
        </Link>

        <div className="relative">
          <h2 className="text-4xl xl:text-5xl font-black leading-[1.08] tracking-tight">
            Welcome back.<br />
            <span className="text-white/80">Your money missed you.</span>
          </h2>
          <p className="mt-4 max-w-sm text-slate-400 leading-relaxed text-base">
            Pick up where you left off — budgets, goals and insights are waiting.
          </p>
        </div>

        <p className="relative text-sm text-slate-500">© 2026 FinTrack · Take Control of Your Money.</p>
      </div>

      {/* Right panel (Mobile & Desktop Form) */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#0b0e11]">

        {/* Ambient Visual Atmosphere (Visible on mobile & desktop) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 -right-28 h-[360px] w-[360px] sm:h-[460px] sm:w-[460px] rounded-full bg-gradient-to-br from-emerald-500/10 via-slate-500/5 to-transparent blur-3xl" style={{ animationDuration: "7s" }} />
          <div className="absolute -bottom-28 -left-28 h-[320px] w-[320px] sm:h-[420px] sm:w-[420px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-slate-500/5 to-transparent blur-3xl" style={{ animationDuration: "9s" }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]" />
        </div>

        {/* Mobile header */}
        <div className="relative z-10 flex items-center px-6 pt-7 pb-2 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-bold shadow-md shadow-xs">
              <Wallet className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">FinTrack</span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-md">

            {/* Main Auth Card with Neon Accent Trim & Glassmorphism */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#15181d]/90 sm:p-8">
              {/* Neon Lime Top Accent Line */}
              <div className="absolute -top-[1px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full opacity-80" />

              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Sign in</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Welcome back to FinTrack</p>
              </div>

              {isTimeout && (
                <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Session expired. Please sign in again.</span>
                </div>
              )}
              {err && (
                <div className="mb-4 rounded-xl bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">{err}</div>
              )}

              <form ref={formRef} onSubmit={submit} autoComplete="off" className="space-y-4">
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputCls} pl-10`}
                      type="email"
                      name="fintrack_login_email"
                      autoComplete="off"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputCls} pl-10 pr-11`}
                      type={show ? "text" : "password"}
                      name="fintrack_login_password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs font-semibold text-slate-900 hover:underline dark:text-emerald-400 transition">
                    Forgot password?
                  </Link>
                </div>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full py-3.5 text-sm font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-lg shadow-xs rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No account?{" "}
              <Link href="/register" className="font-bold text-slate-900 hover:underline dark:text-emerald-400 transition">
                Create one free
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
