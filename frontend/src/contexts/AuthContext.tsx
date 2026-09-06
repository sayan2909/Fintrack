"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  currency?: string;
  theme?: string;
  dateFormat?: string;
  avatarUrl?: string | null;
  notifyBudget?: boolean;
  notifyRecurring?: boolean;
  notifyGoals?: boolean;
  notifySummary?: boolean;
  hasSeenTour?: boolean;
}

export interface Session {
  id: string;
  device: "Desktop" | "Mobile" | "Tablet" | string;
  browser: string;
  os: string;
  ipAddress?: string;
  lastActive: string | Date;
  createdAt: string | Date;
  expiresAt: string | Date;
  isCurrent?: boolean;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  setSession: (s: Session | null) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
        setSession(json.data.session || null);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Login failed");
    setUser(json.data.user);
    setSession(json.data.session || null);
  };

  const register = async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Registration failed");
    if (json.data?.user) {
      setUser(json.data.user);
      setSession(json.data.session || null);
    } else {
      await refresh();
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Logout error", e);
    }
    setUser(null);
    setSession(null);
    window.location.href = "/";
  };

  const status: AuthStatus = loading ? "loading" : user ? "authenticated" : "unauthenticated";

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        status,
        login,
        register,
        logout,
        refresh,
        setUser,
        setSession,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Standard Next.js / Auth.js-style hook for accessing current session
 */
export function useSession() {
  const ctx = useAuth();
  return {
    data: ctx.user ? { user: ctx.user, session: ctx.session } : null,
    status: ctx.status,
    update: ctx.refresh,
  };
}
