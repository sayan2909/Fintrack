"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, inputCls } from "@/components/ui";

function Form() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const token = params.get("token") || "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword: confirm }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setOk(json.data.message);
      setTimeout(() => router.push("/login"), 1500);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-extrabold">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a strong new password.</p>
      {err && <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{err}</div>}
      {ok && <div className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{ok}</div>}
      <div className="mt-5 space-y-4">
        <Field label="New password"><input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Confirm password"><input className={inputCls} type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <Button type="submit" loading={loading} className="w-full">Reset Password</Button>
        <p className="text-center text-sm text-slate-500"><Link href="/login" className="font-bold text-indigo-600 hover:underline">Back to sign in</Link></p>
      </div>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Suspense><Form /></Suspense>
    </div>
  );
}
