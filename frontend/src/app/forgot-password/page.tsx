"use client";

import Link from "next/link";
import { useState } from "react";
import { Wallet, Mail, ArrowRight, CheckCircle2, Copy, Check, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left Brand Showcase (Desktop) */}
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold">FinTrack</span>
        </Link>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Secure Recovery Flow</span>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Account Recovery.<br />Safe, verified & private.
          </h2>
          <p className="mt-3 max-w-md text-indigo-100 text-sm">
            Regain access to your financial milestones, live analytics, and budgets with zero hassle.
          </p>
        </div>
        <p className="text-xs text-indigo-200">Take Control of Your Money.</p>
      </div>

      {/* Right Form Container */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
          {/* Mobile brand header */}
          <div className="flex items-center gap-2.5 lg:hidden mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">FinTrack</span>
          </div>

          {!resetData ? (
            /* Step 1: Request Reset Link Form */
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 mb-4">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Forgot password?
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Enter your account email and we&apos;ll generate a secure reset link.
              </p>

              {err && (
                <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                  {err}
                </div>
              )}

              <form onSubmit={submit} className="mt-5 space-y-4">
                <Field label="Account Email Address">
                  <div className="relative">
                    <input
                      className={`${inputCls} pl-10`}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Button type="submit" loading={loading} className="w-full py-2.5 text-xs font-bold">
                  Generate Reset Link <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:underline"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 text-xs font-bold transition shadow-xs"
                >
                  Proceed to Reset Password <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-4 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
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
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
