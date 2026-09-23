"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Wallet, Eye, EyeOff, ArrowRight, User, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Field, inputCls } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    if (formRef.current) formRef.current.reset();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Registration failed");
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
            Start managing<br />
            <span className="text-white/80">your finances today.</span>
          </h2>
          <p className="mt-4 max-w-sm text-slate-400 leading-relaxed text-base">
            Join thousands building healthier money habits with FinTrack.
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
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Create account</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Join FinTrack in under a minute</p>
              </div>

              {err && (
                <div className="mb-4 rounded-xl bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">{err}</div>
              )}

              <form ref={formRef} onSubmit={submit} autoComplete="off" className="space-y-4">
                <Field label="Full name">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputCls} pl-10`}
                      name="fintrack_reg_name"
                      autoComplete="off"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Aarav Sharma"
                    />
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputCls} pl-10`}
                      type="email"
                      name="fintrack_reg_email"
                      autoComplete="off"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Password" hint="8+ chars, upper, lower, number">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        className={`${inputCls} pl-10 pr-10`}
                        type={show ? "text" : "password"}
                        name="fintrack_reg_password"
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShow(!show)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                      >
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        className={`${inputCls} pl-10`}
                        type="password"
                        name="fintrack_reg_confirm_password"
                        autoComplete="new-password"
                        required
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  </Field>
                </div>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full py-3.5 text-sm font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-lg shadow-xs rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
                  By registering, you agree to our{" "}
                  <Link href="/terms" className="font-semibold underline hover:text-slate-900 dark:hover:text-emerald-500">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-semibold underline hover:text-slate-900 dark:hover:text-emerald-500">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-slate-900 hover:underline dark:text-emerald-400 transition">
                Sign in
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
