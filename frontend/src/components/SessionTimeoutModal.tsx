"use client";

import { useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY_CLOSED_AT = "fintrack_closed_at";
const STORAGE_KEY_LAST_ONLINE = "fintrack_last_online";
const STORAGE_KEY_TIMEOUT_MINS = "fintrack_session_timeout_mins";
const DEFAULT_TIMEOUT_MINS = 15; // Default 15 minutes

export function SessionTimeoutModal() {
  const { user } = useAuth();

  // Get configured timeout in minutes (from localStorage or default 15 mins)
  const getTimeoutMs = useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_TIMEOUT_MINS * 60 * 1000;
    const stored = localStorage.getItem(STORAGE_KEY_TIMEOUT_MINS);
    const valid = ["0", "15", "30", "60", "240"];
    const mins = stored && valid.includes(stored) ? parseInt(stored, 10) : DEFAULT_TIMEOUT_MINS;
    if (mins <= 0) return 0; // 0 means Never (stay logged in indefinitely)
    return mins * 60 * 1000;
  }, []);

  const handleLoggedOutRedirect = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_CLOSED_AT);
      localStorage.removeItem(STORAGE_KEY_LAST_ONLINE);
    }
    // Invalidate session on server
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/login?reason=exit_timeout";
  }, []);

  // Check how long the website was closed
  const checkExitDuration = useCallback(() => {
    if (!user || typeof window === "undefined") return;
    const timeoutMs = getTimeoutMs();
    if (timeoutMs <= 0) return; // Disabled

    const closedAtStr = localStorage.getItem(STORAGE_KEY_CLOSED_AT);
    const lastOnlineStr = localStorage.getItem(STORAGE_KEY_LAST_ONLINE);

    const closedAt = closedAtStr ? parseInt(closedAtStr, 10) : 0;
    const lastOnline = lastOnlineStr ? parseInt(lastOnlineStr, 10) : 0;
    const exitTimestamp = Math.max(closedAt, lastOnline);

    if (exitTimestamp > 0) {
      const elapsed = Date.now() - exitTimestamp;
      if (elapsed >= timeoutMs) {
        // Closed for longer than 5 mins (or configured timeout) -> sign out
        handleLoggedOutRedirect();
        return;
      }
    }

    // Still within allowed time -> clear closed timestamp and stay logged in
    localStorage.removeItem(STORAGE_KEY_CLOSED_AT);
    localStorage.setItem(STORAGE_KEY_LAST_ONLINE, Date.now().toString());
  }, [user, getTimeoutMs, handleLoggedOutRedirect]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    // Check if the user returned after closing for > 5 mins
    checkExitDuration();

    // Heartbeat: update last online timestamp every 5 seconds while website is open
    const interval = setInterval(() => {
      localStorage.setItem(STORAGE_KEY_LAST_ONLINE, Date.now().toString());
      localStorage.removeItem(STORAGE_KEY_CLOSED_AT);
    }, 5000);

    // When tab/window is closing or hidden
    const onExit = () => {
      const now = Date.now().toString();
      localStorage.setItem(STORAGE_KEY_CLOSED_AT, now);
      localStorage.setItem(STORAGE_KEY_LAST_ONLINE, now);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onExit();
      } else if (document.visibilityState === "visible") {
        checkExitDuration();
      }
    };

    window.addEventListener("pagehide", onExit);
    window.addEventListener("beforeunload", onExit);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onExit);
      window.removeEventListener("beforeunload", onExit);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, checkExitDuration]);

  // While user is on the website, they can stay as long as they want - no intrusive modal
  return null;
}
