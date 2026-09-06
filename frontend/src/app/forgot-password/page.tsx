"use client";

import Link from "next/link";
import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button, Field, inputCls } from "@/components/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsg(json.data.message);
      if (json.data.resetToken) setToken(json.data.resetToken);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Wallet className="h-5 w-5" /></div><span className="font-extrabold">FinTrack</span></div>
        <h1 className="mt-4 text-2xl font-extrabold">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll generate a reset link.</p>
        {err && <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{err}</div>}
        {msg && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            {msg}
            {token && (
              <Link href={`/reset-password?token=${token}`} className="mt-2 block font-bold underline">Continue to reset →</Link>
            )}
          </div>
        )}
        <div className="mt-5 space-y-4">
          <Field label="Email"><input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
          <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
          <p className="text-center text-sm text-slate-500"><Link href="/login" className="font-bold text-indigo-600 hover:underline">Back to sign in</Link></p>
        </div>
      </form>
    </div>
  );
}
