import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { ok, fail } from "@/lib/response";
import { ensureDefaultCategories } from "@/lib/server-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email?.trim() || !password) return fail("Email and password are required.", 400);
    const normalized = email.trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    const user = rows[0];
    if (!user) return fail("Invalid email or password.", 401);
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return fail("Invalid email or password.", 401);

    await ensureDefaultCategories(user.id);
    const token = signToken({ id: user.id, email: user.email });
    const session = await createUserSession({ userId: user.id, token, req });

    const res = ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        theme: user.theme,
        dateFormat: user.dateFormat,
        avatarUrl: user.avatarUrl,
        hasSeenTour: user.hasSeenTour ?? false,
      },
      session: session
        ? {
            id: session.id,
            device: session.device,
            browser: session.browser,
            os: session.os,
            ipAddress: session.ipAddress,
            lastActive: session.lastActive,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isCurrent: true,
          }
        : null,
      token,
    });
    setAuthCookie(res, token, req);
    return res;
  } catch (e) {
    console.error("login error", e);
    return fail("Unable to sign in. Please try again.", 500);
  }
}
