import type { Request } from "express";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";

export interface ParsedClientInfo {
  device: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  ipAddress: string;
  userAgent: string;
}

export function normalizeIp(rawIp?: string | null): string {
  if (!rawIp) return "127.0.0.1";
  let ip = rawIp.trim();

  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip === "localhost") {
    ip = "127.0.0.1";
  }

  return ip;
}

export async function resolvePublicIpIfLocal(ip: string): Promise<string> {
  const normalized = normalizeIp(ip);
  if (
    normalized === "127.0.0.1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("172.16.")
  ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as { ip?: string };
        if (data?.ip) {
          return normalizeIp(data.ip);
        }
      }
    } catch {
      // Return normalized local IP on timeout/offline
    }
  }
  return normalized;
}

/**
 * Parses user agent string to identify device category, browser, and OS without external dependencies.
 */
export function parseClientInfo(req?: Request | null): ParsedClientInfo {
  if (!req) {
    return {
      device: "Desktop",
      browser: "Unknown",
      os: "Unknown",
      ipAddress: "127.0.0.1",
      userAgent: "",
    };
  }

  const ua = (req.headers["user-agent"] as string) || "";
  
  const rawIp =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["true-client-ip"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    (req.headers["x-client-ip"] as string) ||
    (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
    req.ip ||
    "127.0.0.1";

  const ip = normalizeIp(rawIp);

  // OS Detection
  let os = "Unknown OS";
  if (/windows phone/i.test(ua)) os = "Windows Phone";
  else if (/win64|win32|windows/i.test(ua)) os = "Windows";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/iphone|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Device Type Detection
  let device: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = "Tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) {
    device = "Mobile";
  }

  // Browser Detection
  let browser = "Unknown Browser";
  if (/edg\/([0-9]+)/i.test(ua)) {
    browser = `Edge ${RegExp.$1}`;
  } else if (/opr\/([0-9]+)|opera/i.test(ua)) {
    browser = `Opera ${RegExp.$1 || ""}`.trim();
  } else if (/samsungbrowser\/([0-9]+)/i.test(ua)) {
    browser = `Samsung Internet ${RegExp.$1}`;
  } else if (/chrome\/([0-9]+)/i.test(ua) && !/chromium/i.test(ua)) {
    browser = `Chrome ${RegExp.$1}`;
  } else if (/firefox\/([0-9]+)/i.test(ua)) {
    browser = `Firefox ${RegExp.$1}`;
  } else if (/safari\/([0-9]+)/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = "Safari";
  }

  return {
    device,
    browser,
    os,
    ipAddress: ip,
    userAgent: ua.slice(0, 500),
  };
}

export async function createUserSession({
  userId,
  token,
  req,
  expiresAt,
}: {
  userId: string;
  token: string;
  req?: Request | null;
  expiresAt?: Date;
}) {
  try {
    const info = parseClientInfo(req);
    const resolvedIp = await resolvePublicIpIfLocal(info.ipAddress);
    const expiry = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inserted = await db
      .insert(sessions)
      .values({
        userId,
        token,
        ipAddress: resolvedIp,
        userAgent: info.userAgent,
        device: info.device,
        browser: info.browser,
        os: info.os,
        expiresAt: expiry,
        lastActive: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.token,
        set: {
          lastActive: new Date(),
          ipAddress: resolvedIp,
          userAgent: info.userAgent,
          device: info.device,
          browser: info.browser,
          os: info.os,
        },
      })
      .returning();

    return inserted[0];
  } catch (err) {
    console.error("[Session] Error creating session:", err);
    return null;
  }
}

const lastActiveCache = new Map<string, number>();

export async function touchSession(token: string) {
  try {
    const now = Date.now();
    const lastUpdate = lastActiveCache.get(token) || 0;
    if (now - lastUpdate < 60000) return;

    lastActiveCache.set(token, now);
    await db
      .update(sessions)
      .set({ lastActive: new Date() })
      .where(eq(sessions.token, token));
  } catch {
    // Non-blocking
  }
}

export async function destroySessionByToken(token: string) {
  try {
    lastActiveCache.delete(token);
    await db.delete(sessions).where(eq(sessions.token, token));
  } catch (err) {
    console.error("[Session] Error destroying session by token:", err);
  }
}

export async function destroySessionById(sessionId: string, userId: string) {
  try {
    await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    return true;
  } catch (err) {
    console.error("[Session] Error destroying session by ID:", err);
    return false;
  }
}

export async function destroyAllOtherSessions(userId: string, currentToken: string) {
  try {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.token, currentToken)));
    return true;
  } catch (err) {
    console.error("[Session] Error destroying other sessions:", err);
    return false;
  }
}

export async function listUserSessions(userId: string, currentToken?: string | null) {
  try {
    const rows = await db
      .select({
        id: sessions.id,
        device: sessions.device,
        browser: sessions.browser,
        os: sessions.os,
        ipAddress: sessions.ipAddress,
        lastActive: sessions.lastActive,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        token: sessions.token,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastActive));

    const now = new Date();
    return rows
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ipAddress: normalizeIp(s.ipAddress),
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: Boolean(currentToken && s.token === currentToken),
      }));
  } catch (err) {
    console.error("[Session] Error listing sessions:", err);
    return [];
  }
}
