"use client";

import { ReactNode, useEffect, useState } from "react";
import { Loader2, X, AlertTriangle, CheckCircle2, AlertCircle, Info } from "lucide-react";

// ---------- Card ----------
export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:border-slate-300/90 dark:border-slate-800/80 dark:bg-[#0f172a] dark:hover:border-slate-700/80 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- Button ----------
export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  loading,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 font-semibold",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-medium",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 font-semibold",
    outline:
      "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/80 font-medium",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- Input ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 hover:bg-white focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-850 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/30";

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-fade-up w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-[#0f172a]`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Confirm ----------
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmText = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 ring-1 ring-rose-500/25">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Progress ----------
export function Progress({ value, color }: { value: number; color?: string }) {
  const v = Math.min(100, Math.max(0, value));
  let bar = color;
  if (!bar) bar = v >= 100 ? "bg-rose-500" : v >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50 dark:border-transparent dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${v}%` }} />
    </div>
  );
}

// ---------- Badge ----------
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "indigo" | "blue" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
    red: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50",
    amber: "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50",
    blue: "bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/50",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

// ---------- Empty ----------
export function EmptyState({
  icon,
  title,
  message,
  action,
  badge,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-300/80 bg-gradient-to-b from-white to-slate-50/50 px-6 py-14 text-center transition-colors dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950/60 shadow-xs">
      {badge && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          {badge}
        </div>
      )}
      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-500/15 blur-lg dark:bg-indigo-500/25" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 shadow-md shadow-indigo-500/10 dark:border-indigo-500/20 dark:bg-slate-800 dark:text-indigo-400">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

// ---------- Skeleton ----------
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800 ${className}`} />;
}

// ---------- Toast ----------
export interface Toast { id: number; message: string; kind: "success" | "error" | "info" }
let toastPush: ((t: Omit<Toast, "id">) => void) | null = null;
export function toast(message: string, kind: Toast["kind"] = "success") {
  toastPush?.({ message, kind });
}
export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    toastPush = ({ message, kind }) => {
      const id = Date.now() + Math.random();
      setItems((p) => [...p, { id, message, kind }]);
      setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
    };
    return () => {
      toastPush = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md animate-fade-up border ${
            t.kind === "success"
              ? "bg-emerald-950/90 text-emerald-100 border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-200"
              : t.kind === "error"
              ? "bg-rose-950/90 text-rose-100 border-rose-800/60 dark:bg-rose-950/90 dark:text-rose-200"
              : "bg-slate-900/90 text-white border-slate-700/60 dark:bg-slate-800/90"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : t.kind === "error" ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Stat helpers ----------
export function StatDelta({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {value > 0 ? "▲" : value < 0 ? "▼" : "●"} {Math.abs(value)}%
    </span>
  );
}
