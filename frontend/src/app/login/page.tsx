"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Wallet, Eye, EyeOff, Clock } from "lucide-react";
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

  // Clear inputs on mount and detect timeout notice
  useEffect(() => {
    setEmail("");
    setPassword("");
    if (formRef.current) {
      formRef.current.reset();
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "timeout" || reason === "exit_timeout") {
        setIsTimeout(true);
      }
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Wallet className="h-5 w-5" /></div>
          <span className="text-xl font-extrabold">FinTrack</span>
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Welcome back.<br />Your money missed you.</h2>
          <p className="mt-3 max-w-md text-indigo-100">Pick up where you left off — budgets, goals and insights are waiting.</p>
        </div>
        <p className="text-sm text-indigo-200">Take Control of Your Money.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <form
          ref={formRef}
          onSubmit={submit}
          autoComplete="off"
          className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back to FinTrack.</p>
          {isTimeout && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>You have been logged out, please login again.</span>
            </div>
          )}
          {err && <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{err}</div>}
          <div className="mt-5 space-y-4">
            <Field label="Email">
              <input
                className={inputCls}
                type="email"
                name="fintrack_login_email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className={`${inputCls} pr-11`}
                  type={show ? "text" : "password"}
                  name="fintrack_login_password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" loading={loading} className="w-full py-3">Sign In</Button>
            <p className="text-center text-sm text-slate-500">No account? <Link href="/register" className="font-bold text-indigo-600 hover:underline">Create one</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
