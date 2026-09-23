import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
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

import { randomBytes } from "crypto";

export function signToken(payload: { id: string; email: string }) {
  const nonce = randomBytes(8).toString("hex");
  return jwt.sign({ ...payload, nonce }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE];
  if (cookieToken) return cookieToken;
  const auth = req.headers.authorization;
  if (auth && typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIE,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getAuthUser(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  let currentSession = sessionRows[0];

  if (!currentSession) {
    currentSession = (await createUserSession({
      userId: decoded.id,
      token,
      req,
    })) as typeof sessions.$inferSelect;
  } else if (new Date(currentSession.expiresAt) < new Date()) {
    return null;
  } else {
    touchSession(token);
  }

  const rows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
  const user = rows[0];
  if (!user) return null;
  const { passwordHash: _ph, resetToken: _rt, resetExpires: _re, ...safe } = user;
  return { ...safe, currentSessionId: currentSession?.id };
}

export async function getActiveSession(req: Request) {
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

export type SafeUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

/**
 * Express middleware to require authentication.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Authentication failed" });
  }
}

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
