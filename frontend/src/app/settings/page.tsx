"use client";

import { useEffect, useState, useCallback } from "react";
import {
  User,
  Bell,
  Shield,
  Palette,
  LogOut,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Lock,
  XCircle,
  Download,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, Button, Field, inputCls, toast, Modal } from "@/components/ui";
import { useAuth, Session } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getEstimatedRate, SUPPORTED_CURRENCIES, fetchLiveRates } from "@/lib/currency";

function formatRelativeTime(dateStr: string | Date | undefined) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatLastActive(dateStr: string | Date | undefined) {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    avatarUrl: "",
  });
  const [prefs, setPrefs] = useState({
    notifyBudget: true,
    notifyRecurring: true,
    notifyGoals: true,
    notifySummary: true,
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Inactivity timeout state (default 15 mins)
  const [timeoutMins, setTimeoutMins] = useState("15");

  // Danger Zone: Account & Data Deletion
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeInput, setPurgeInput] = useState("");
  const [purging, setPurging] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [exportingBackup, setExportingBackup] = useState(false);

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const res = await fetch("/api/auth/export-data", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate backup archive");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Financial data backup downloaded successfully! 💾");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error downloading data backup", "error");
    } finally {
      setExportingBackup(false);
    }
  };

  const handlePurgeData = async () => {
    if (purgeInput.trim() !== "RESET DATA") {
      toast("Please type RESET DATA to confirm", "error");
      return;
    }
    try {
      setPurging(true);
      const res = await fetch("/api/auth/purge-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmation: purgeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to reset data");
      toast(data.message || "Financial records successfully reset");
      setPurgeOpen(false);
      setPurgeInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error resetting data";
      toast(msg, "error");
    } finally {
      setPurging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast("Please enter your current password", "error");
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete account");
      toast("Account permanently deleted");
      setDeleteOpen(false);
      logout();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting account";
      toast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchLiveRates().catch(() => {});
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fintrack_session_timeout_mins");
      const validOptions = ["0", "15", "30", "60", "240"];
      if (stored !== null && validOptions.includes(stored)) {
        setTimeoutMins(stored);
      } else {
        setTimeoutMins("15");
      }
    }
  }, []);

  const handleTimeoutChange = (val: string) => {
    setTimeoutMins(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("fintrack_session_timeout_mins", val);
      const labels: Record<string, string> = {
        "0": "Inactivity sign-out disabled (Never)",
        "15": "Auto sign-out set to 15 minutes",
        "30": "Auto sign-out set to 30 minutes",
        "60": "Auto sign-out set to 1 hour",
        "240": "Auto sign-out set to 4 hours",
      };
      toast(labels[val] || `Auto sign-out set to ${val} minutes`);
    }
  };

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
        currency: (user as unknown as { currency?: string }).currency || "INR",
        dateFormat: (user as unknown as { dateFormat?: string }).dateFormat || "DD/MM/YYYY",
        avatarUrl: (user as unknown as { avatarUrl?: string }).avatarUrl || "",
      });
      setPrefs({
        notifyBudget: (user as unknown as { notifyBudget?: boolean }).notifyBudget ?? true,
        notifyRecurring: (user as unknown as { notifyRecurring?: boolean }).notifyRecurring ?? true,
        notifyGoals: (user as unknown as { notifyGoals?: boolean }).notifyGoals ?? true,
        notifySummary: (user as unknown as { notifySummary?: boolean }).notifySummary ?? true,
      });
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.sessions)) {
        setSessions(json.data.sessions);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const revokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const res = await fetch(`/api/auth/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast("Session revoked successfully");
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to revoke session", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      setRevokingAll(true);
      const res = await fetch("/api/auth/sessions?all=true", {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast("Logged out of all other devices");
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to revoke sessions", "error");
    } finally {
      setRevokingAll(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...profile, ...prefs }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setUser(json.data.user);
      if (json.data.conversion) {
        toast(`Currency changed to ${json.data.conversion.toCurrency}! All balances, transactions, and budgets converted (rate: ×${json.data.conversion.rate.toFixed(4)}). 💱`);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast("Settings saved");
      }
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(pw),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to update password");
      toast("Password changed successfully! 🎉");
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "Failed to change password", "error");
    } finally {
      setChangingPw(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const [activeTab, setActiveTab] = useState<"general" | "security" | "notifications" | "data">("general");

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your profile, security credentials, active sessions, and account data.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-5 inline-flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1 border border-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 overflow-x-auto max-w-full">
        {[
          { id: "general", label: "Profile & Preferences", icon: User },
          { id: "security", label: "Security & Sessions", icon: Shield },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "data", label: "Account & Data Controls", icon: ShieldAlert },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as "general" | "security" | "notifications" | "data")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? "bg-white text-indigo-700 shadow-2xs ring-1 ring-black/5 dark:bg-indigo-600 dark:text-white dark:ring-0 font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
            }`}
          >
            <t.icon className="h-4 w-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Profile & Preferences */}
      {activeTab === "general" && (
        <form onSubmit={saveProfile} className="mt-4 space-y-4 animate-fade-up">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Information</h3>
                  <p className="text-xs text-slate-500">Your profile details across FinTrack.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3.5">
                <Field label="Full Name">
                  <input
                    className={inputCls}
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </Field>
                <Field label="Email Address">
                  <input
                    className={inputCls}
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </Field>
                <Field label="Profile Image URL (Optional)">
                  <input
                    className={inputCls}
                    value={profile.avatarUrl}
                    onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            </Card>

            {/* Regional & Display */}
            <Card>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-0">
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Regional & Display</h3>
                  <p className="text-xs text-slate-500">Currency, date formatting and theme.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency">
                    <select
                      className={inputCls}
                      value={profile.currency}
                      onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date format">
                    <select
                      className={inputCls}
                      value={profile.dateFormat}
                      onChange={(e) => setProfile({ ...profile, dateFormat: e.target.value })}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD MMM YYYY">DD MMM YYYY</option>
                    </select>
                  </Field>
                </div>

                {/* Currency Conversion Live Preview Info */}
                {profile.currency !== (user?.currency || "INR") && (
                  <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <div className="flex items-center gap-2 font-bold">
                      <ArrowRightLeft className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Automatic Balance & Amount Conversion</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Switching currency from <strong>{user?.currency || "INR"}</strong> to <strong>{profile.currency}</strong> will automatically convert all your existing account balances, transactions, budgets, goals, and bills using the exchange rate (<strong>1 {user?.currency || "INR"} ≈ {getEstimatedRate(user?.currency || "INR", profile.currency).toFixed(4)} {profile.currency}</strong>).
                    </p>
                  </div>
                )}
                <Field label="Theme Mode">
                  <select
                    className={inputCls}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </Field>
              </div>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              Save Profile Settings
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: Security & Sessions */}
      {activeTab === "security" && (
        <div className="mt-4 space-y-4 animate-fade-up">
          {/* Change Password Card */}
          <Card>
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Account Password</h3>
                <p className="text-xs text-slate-500">Ensure your account is protected with a strong, secure password.</p>
              </div>
            </div>
            <form onSubmit={changePw} className="mt-4 space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Field label="Current Password">
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-10`}
                      type={showCurrentPw ? "text" : "password"}
                      required
                      value={pw.currentPassword}
                      onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="New Password">
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-10`}
                      type={showNewPw ? "text" : "password"}
                      required
                      value={pw.newPassword}
                      onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm New Password">
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-10`}
                      type={showConfirmPw ? "text" : "password"}
                      required
                      value={pw.confirmPassword}
                      onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              {pw.newPassword.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] dark:border-slate-800/80 dark:bg-slate-900/60 space-y-1.5 max-w-xl">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Password Requirements
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${pw.newPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {pw.newPassword.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>8+ chars</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(pw.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {/[A-Z]/.test(pw.newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>1 uppercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[a-z]/.test(pw.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {/[a-z]/.test(pw.newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>1 lowercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[0-9]/.test(pw.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {/[0-9]/.test(pw.newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>1 number</span>
                    </div>
                  </div>
                  {pw.confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800 ${pw.newPassword === pw.confirmPassword ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-500 font-semibold"}`}>
                      {pw.newPassword === pw.confirmPassword ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>{pw.newPassword === pw.confirmPassword ? "Passwords match" : "Passwords do not match"}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button type="submit" loading={changingPw}>Update Password</Button>
              </div>
            </form>
          </Card>

          {/* Automatic Inactivity Timeout Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sign out automatically when inactive</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically sign out after a period of inactivity or when the website is closed to protect your finances.
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-56 shrink-0">
                <select
                  className={inputCls}
                  value={timeoutMins}
                  onChange={(e) => handleTimeoutChange(e.target.value)}
                >
                  <option value="0">Never</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Active Sessions & Devices Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Sessions & Devices</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage devices and web browsers currently authenticated to your account.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={loadSessions}
                  disabled={loadingSessions}
                  className="h-8 px-3 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingSessions ? "animate-spin" : ""}`} /> Refresh
                </Button>
                {otherSessionsCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={revokeAllOtherSessions}
                    loading={revokingAll}
                    className="h-8 px-3 text-xs text-rose-600 hover:text-rose-700 hover:border-rose-300 dark:text-rose-400"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" /> Log out all other devices ({otherSessionsCount})
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {loadingSessions && sessions.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">Loading active sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">No active session records found.</div>
              ) : (
                sessions.map((sess) => {
                  const isMobile = sess.device === "Mobile";
                  const isTablet = sess.device === "Tablet";
                  const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

                  return (
                    <div
                      key={sess.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            sess.isCurrent
                              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <DeviceIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {sess.os || sess.device}
                            </span>
                            {sess.isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                This device
                              </span>
                            )}
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                              {sess.isCurrent ? (
                                <span className="text-emerald-600 font-medium dark:text-emerald-400">Active now</span>
                              ) : (
                                <span>Last active {formatLastActive(sess.lastActive)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{sess.browser} • {sess.device}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center sm:self-center self-end">
                        {sess.isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Current Session
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => revokeSession(sess.id)}
                            loading={revokingId === sess.id}
                            className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-1" /> Log out
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              If you don&apos;t recognise any device or can&apos;t access it any longer, revoke its session immediately.
            </p>
          </Card>
        </div>
      )}

      {/* TAB 3: Notifications */}
      {activeTab === "notifications" && (
        <form onSubmit={saveProfile} className="mt-4 space-y-4 animate-fade-up">
          <Card>
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
                <p className="text-xs text-slate-500">Configure real-time alerts and financial updates.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["notifyBudget", "Budget Overrun Alerts", "Receive immediate warnings when category spending reaches 80% or exceeds budget limit"],
                ["notifyRecurring", "Upcoming Bill Reminders", "Alerts for scheduled recurring subscriptions and bills due within 7 days"],
                ["notifyGoals", "Savings Milestones", "Celebrate when you reach 25%, 50%, 75% or 100% of a savings goal"],
                ["notifySummary", "Monthly Financial Summary", "Periodic financial recaps analyzing your income, expenses, and savings"],
              ].map(([k, label, desc]) => (
                <label
                  key={k}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/60 transition cursor-pointer"
                >
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs[k as keyof typeof prefs]}
                    onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })}
                    className="h-4 w-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={saving}>
                Save Preferences
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* TAB 4: Account & Data Controls */}
      {activeTab === "data" && (
        <div className="mt-4 space-y-4 animate-fade-up">
          {/* Account Session & Sign Out */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <LogOut className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sign Out of FinTrack</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Terminate your active authenticated session on this browser device.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="shrink-0 text-xs h-9 px-4 font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log Out
              </Button>
            </div>
          </Card>

          {/* Financial Data Backup & Portability Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Export Financial Data Backup</h3>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      JSON Archive
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                    Download a complete offline backup archive of your accounts, transactions, custom categories, monthly budgets, and savings goals.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExportBackup}
                loading={exportingBackup}
                className="shrink-0 text-xs h-9 px-4 font-bold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Backup
              </Button>
            </div>
          </Card>

          {/* Danger Zone: Unified Enterprise Action Panel */}
          <div className="rounded-2xl border border-rose-200/80 bg-white dark:border-rose-950/60 dark:bg-[#111827] shadow-xs overflow-hidden">
            {/* Danger Zone Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-rose-100 dark:border-rose-950/50 bg-rose-50/40 dark:bg-rose-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 ring-1 ring-rose-500/25">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Danger Zone
                    </h3>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                      Irreversible
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Critical operations to reset your records or permanently purge your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Action 1: Reset Financial Data */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 mt-0.5 sm:mt-0">
                    <RefreshCw className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Reset Financial Records
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed max-w-xl">
                      Deletes all transactions, custom categories, budgets, and recurring bills, while keeping your account login credentials intact.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setPurgeInput("");
                    setPurgeOpen(true);
                  }}
                  className="shrink-0 h-9 px-4 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800/80 dark:text-amber-400 dark:hover:bg-amber-950/40 transition cursor-pointer"
                >
                  Reset Records...
                </Button>
              </div>

              {/* Action 2: Delete Entire Account */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-rose-50/30 dark:hover:bg-rose-950/15 transition">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 mt-0.5 sm:mt-0">
                    <Trash2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                      Delete FinTrack Account
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed max-w-xl">
                      Permanently destroys your user account, active device sessions, and entire monetary history. This action cannot be reversed.
                    </p>
                  </div>
                </div>

                <Button
                  variant="danger"
                  onClick={() => {
                    setDeletePassword("");
                    setDeleteOpen(true);
                  }}
                  className="shrink-0 h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Delete Account...
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purge Data Modal */}
      <Modal open={purgeOpen} onClose={() => setPurgeOpen(false)} title="Reset Financial Data">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p>
              This will permanently delete all your logged transactions, recurring bills, category budgets, and savings goals. Account login details will be preserved.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Type <span className="font-mono font-bold text-rose-600">RESET DATA</span> to confirm:
            </label>
            <input
              type="text"
              value={purgeInput}
              onChange={(e) => setPurgeInput(e.target.value)}
              placeholder="RESET DATA"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPurgeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handlePurgeData}
              loading={purging}
              disabled={purgeInput.trim() !== "RESET DATA"}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete FinTrack Account">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>
              <strong>Warning:</strong> Your account, profile, all financial data, and active sessions will be permanently purged from the server immediately.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter your current password to authorize permanent deletion:
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your current password"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={!deletePassword}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
