import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { touchSession, createUserSession } from "./session";

const JWT_SECRET = process.env.JWT_SECRET || "fintrack-dev-secret-change-me";
const JWT_EXPIRES = "7d";
export const AUTH_COOKIE = "fintrack_token";

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function signToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function shouldUseSecureCookies(req?: NextRequest | null): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!req) return false;
  
  const host = req.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("192.168.")) {
    return false;
  }
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl?.protocol || "";
  return proto.includes("https");
}

export function setAuthCookie(res: NextResponse, token: string, req?: NextRequest | null) {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax",
  });
}

export async function getAuthUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Check if session exists in DB
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  let currentSession = sessionRows[0];

  if (!currentSession) {
    // Graceful auto-creation for valid existing JWT tokens
    currentSession = (await createUserSession({
      userId: decoded.id,
      token,
      req,
    })) as typeof sessions.$inferSelect;
  } else if (new Date(currentSession.expiresAt) < new Date()) {
    // Session has expired in DB
    return null;
  } else {
    // Touch session activity
    touchSession(token);
  }

  const rows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
  const user = rows[0];
  if (!user) return null;
  const { passwordHash: _ph, resetToken: _rt, resetExpires: _re, ...safe } = user;
  return { ...safe, currentSessionId: currentSession?.id };
}

export async function getActiveSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  const s = sessionRows[0];
  if (!s || new Date(s.expiresAt) < new Date()) return null;

  return {
    id: s.id,
    device: s.device,
    browser: s.browser,
    os: s.os,
    ipAddress: s.ipAddress,
    lastActive: s.lastActive,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: true,
  };
}

export async function getAuthUserFromCookies() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const rows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
  if (!rows[0]) return null;
  const { passwordHash: _ph, resetToken: _rt, resetExpires: _re, ...safe } = rows[0];
  return safe;
}

export type SafeUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  return null;
}
