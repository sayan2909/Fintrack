"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button, Field, inputCls, toast } from "@/components/ui";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // 1. Verify token on initial load
  useEffect(() => {
    if (!token) {
      setTokenError("No password reset token was provided in the URL.");
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        setVerifying(true);
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "This password reset link is invalid or has expired.");
        }
        setUserEmail(json.data.email || "");
      } catch (e2: unknown) {
        setTokenError(e2 instanceof Error ? e2.message : "Reset link verification failed");
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  // 2. Countdown redirect on success
  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, router]);

  // 3. Live validation requirements
  const criteria = useMemo(() => {
    return {
      minLen: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNum: /[0-9]/.test(password),
      matches: password.length > 0 && password === confirm,
    };
  }, [password, confirm]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLen) score++;
    if (criteria.hasUpper) score++;
    if (criteria.hasLower) score++;
    if (criteria.hasNum) score++;
    return score;
  }, [criteria]);

  const canSubmit =
    criteria.minLen &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNum &&
    criteria.matches;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to reset password");
      }
      setSuccess(true);
      toast("Password reset successfully! 🎉");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // State: Token verification loading
  if (verifying) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Verifying security token...
        </p>
      </div>
    );
  }

  // State: Missing, Invalid, or Expired Token
  if (tokenError) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Link Invalid or Expired
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {tokenError} For your security, reset links expire after 1 hour or immediately after being used.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 py-2.5 px-4 text-xs font-black transition shadow-xs"
          >
            <RotateCcw className="h-4 w-4 stroke-[2.5]" /> Request New Reset Link
          </Link>
          <Link
            href="/login"
            className="block text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white pt-1"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // State: Successfully Reset
  if (success) {
    return (
      <div className="space-y-4 text-center animate-fade-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Password Reset Complete!
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Your FinTrack account credentials have been securely updated.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300">
          Redirecting to sign-in in <strong className="font-extrabold">{countdown}s</strong>...
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 py-2.5 px-4 text-xs font-black transition shadow-xs"
          >
            Sign In Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // State: Standard Reset Password Form
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
        Reset password
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Create a new password for <strong className="text-slate-800 dark:text-slate-200">{userEmail}</strong>.
      </p>

      {err && (
        <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4">
        {/* New Password */}
        <Field label="New Password">
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {/* Confirm Password */}
        <Field label="Confirm New Password">
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showConfirm ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {/* Strength Bar */}
        {password.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Password Strength</span>
              <span
                className={
                  strengthScore <= 1
                    ? "text-rose-500 font-bold"
                    : strengthScore <= 3
                    ? "text-amber-500 font-bold"
                    : "text-emerald-500 font-bold"
                }
              >
                {strengthScore <= 1 ? "Weak" : strengthScore <= 3 ? "Moderate" : "Strong"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    strengthScore >= step
                      ? strengthScore <= 1
                        ? "bg-rose-500"
                        : strengthScore <= 3
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                      : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Real-time Checklist */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] dark:border-slate-800/80 dark:bg-slate-900/60 space-y-1.5">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
            Requirements
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div
              className={`flex items-center gap-1.5 ${
                criteria.minLen ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"
              }`}
            >
              {criteria.minLen ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>8+ characters</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                criteria.hasUpper ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"
              }`}
            >
              {criteria.hasUpper ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>1 uppercase letter</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                criteria.hasLower ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"
              }`}
            >
              {criteria.hasLower ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>1 lowercase letter</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                criteria.hasNum ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"
              }`}
            >
              {criteria.hasNum ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>1 number</span>
            </div>
          </div>

          {confirm.length > 0 && (
            <div
              className={`flex items-center gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800 ${
                criteria.matches ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-500 font-semibold"
              }`}
            >
              {criteria.matches ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>{criteria.matches ? "Passwords match" : "Passwords do not match"}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={!canSubmit}
          className="w-full py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset Password <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Fortify your account.<br />
            <span className="text-white/80">Set a new password.</span>
          </h2>
          <p className="mt-4 max-w-sm text-slate-400 leading-relaxed text-base">
            Your new password will be salted and hashed using bcrypt before securely updating your credentials.
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

            {/* Main Card with Neon Accent Trim & Glassmorphism */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#15181d]/90 sm:p-8">
              {/* Neon Lime Top Accent Line */}
              <div className="absolute -top-[1px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full opacity-80" />

              <Suspense
                fallback={
                  <div className="py-12 text-center text-xs font-semibold text-slate-400">
                    Loading security token...
                  </div>
                }
              >
                <ResetPasswordForm />
              </Suspense>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
