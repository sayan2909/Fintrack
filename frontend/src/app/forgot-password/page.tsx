"use client";

import Link from "next/link";
import { useState } from "react";
import { Wallet, Mail, ArrowRight, CheckCircle2, Copy, Check, ArrowLeft } from "lucide-react";
import { Button, Field, inputCls, toast } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState<{
    resetToken: string;
    resetUrl: string;
    email: string;
    expiresIn: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to generate reset link");
      }
      setResetData(json.data);
      toast("Password reset link generated!");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!resetData?.resetUrl) return;
    const fullUrl = `${window.location.origin}${resetData.resetUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast("Reset link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0b0e11] overflow-hidden">
      {/* Left Brand Showcase (Desktop) */}
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
            Account Recovery.<br />
            <span className="text-white/80">Safe, verified & private.</span>
          </h2>
          <p className="mt-4 max-w-sm text-slate-400 leading-relaxed text-base">
            Regain access to your financial milestones, live analytics, and budgets with zero hassle.
          </p>
        </div>
        <p className="relative text-sm text-slate-500">© 2026 FinTrack · Take Control of Your Money.</p>
      </div>

      {/* Right Form Container (Mobile & Desktop) */}
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

            {/* Main Recovery Card with Neon Accent Trim & Glassmorphism */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#15181d]/90 sm:p-8">
              {/* Neon Lime Top Accent Line */}
              <div className="absolute -top-[1px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full opacity-80" />

              {!resetData ? (
                /* Step 1: Request Reset Link Form */
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                      Forgot password?
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Enter your account email and we&apos;ll generate a secure reset link.
                    </p>
                  </div>

                  {err && (
                    <div className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                      {err}
                    </div>
                  )}

                  <form onSubmit={submit} className="space-y-4">
                    <Field label="Account Email Address">
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          className={`${inputCls} pl-10`}
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                    </Field>

                    <Button
                      type="submit"
                      loading={loading}
                      className="w-full py-3.5 text-sm font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-lg shadow-xs rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>Generate Reset Link</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Button>

                    <div className="pt-2 text-center">
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-emerald-500 transition"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                      </Link>
                    </div>
                  </form>
                </div>
              ) : (
                /* Step 2: Generated Link Ready */
                <div className="space-y-4 animate-fade-up">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Reset Link Ready
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      A secure one-time password reset token has been generated for{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{resetData.email}</strong>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs dark:border-emerald-500/20 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Direct Action Link
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Expires in {resetData.expiresIn}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90">
                      Click the button below to proceed to the password reset form.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Link
                      href={resetData.resetUrl}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 py-3.5 px-4 text-sm font-black transition-all duration-200 active:scale-[0.98] shadow-lg shadow-xs"
                    >
                      <span>Proceed to Reset Password</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>

                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 px-4 text-xs font-bold dark:border-white/[0.08] dark:bg-[#1b1f26] dark:text-slate-300 dark:hover:bg-[#222730] transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" /> Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy Reset Link
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setResetData(null);
                        setEmail("");
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-emerald-500 cursor-pointer transition"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
