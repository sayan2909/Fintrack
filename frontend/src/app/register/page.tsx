"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Wallet, Eye, EyeOff } from "lucide-react";
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

  // Clear inputs on mount so previous user's data never remains
  useEffect(() => {
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    if (formRef.current) {
      formRef.current.reset();
    }
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-violet-700 via-indigo-600 to-indigo-700 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Wallet className="h-5 w-5" /></div>
          <span className="text-xl font-extrabold">FinTrack</span>
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Start managing<br />your finances today.</h2>
          <ul className="mt-4 space-y-2 text-indigo-100">
            <li>✓ Smart budgets & savings goals</li>
            <li>✓ Beautiful analytics & insights</li>
            <li>✓ Recurring payments tracking</li>
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Free to start. No credit card required.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <form
          ref={formRef}
          onSubmit={submit}
          autoComplete="off"
          className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <h1 className="text-2xl font-extrabold tracking-tight">Create account</h1>
          <p className="mt-1 text-sm text-slate-500">Join FinTrack in under a minute.</p>
          {err && <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{err}</div>}
          <div className="mt-5 space-y-4">
            <Field label="Full name">
              <input
                className={inputCls}
                name="fintrack_reg_name"
                autoComplete="off"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Aarav Sharma"
              />
            </Field>
            <Field label="Email">
              <input
                className={inputCls}
                type="email"
                name="fintrack_reg_email"
                autoComplete="off"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Password" hint="8+ chars, upper, lower, number">
                <div className="relative">
                  <input
                    className={`${inputCls} pr-10`}
                    type={show ? "text" : "password"}
                    name="fintrack_reg_password"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </Field>
              <Field label="Confirm password">
                <input
                  className={inputCls}
                  type="password"
                  name="fintrack_reg_confirm_password"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <Button type="submit" loading={loading} className="w-full py-3">Create Account</Button>
            <p className="text-center text-sm text-slate-500">Have an account? <Link href="/login" className="font-bold text-indigo-600 hover:underline">Sign in</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
