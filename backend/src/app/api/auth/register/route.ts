import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, signToken, validateEmail, validatePassword, setAuthCookie } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { ok, fail } from "@/lib/response";
import { ensureDefaultCategories } from "@/lib/server-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body ?? {};
    if (!name?.trim()) return fail("Full name is required.", 400);
    if (!email?.trim()) return fail("Email is required.", 400);
    if (!validateEmail(email.trim().toLowerCase())) return fail("Please enter a valid email address.", 400);
    const pwErr = validatePassword(password ?? "");
    if (pwErr) return fail(pwErr, 400);
    if (password !== confirmPassword) return fail("Passwords do not match.", 400);

    const normalized = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (existing.length > 0) return fail("An account with this email already exists.", 409);

    const passwordHash = await hashPassword(password);
    const inserted = await db
      .insert(users)
      .values({ name: name.trim(), email: normalized, passwordHash })
      .returning();
    const user = inserted[0];
    await ensureDefaultCategories(user.id);

    const token = signToken({ id: user.id, email: user.email });
    const session = await createUserSession({ userId: user.id, token, req });

    const res = ok(
      {
        user: { id: user.id, name: user.name, email: user.email, currency: user.currency, theme: user.theme, hasSeenTour: false },
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
      },
      201
    );
    setAuthCookie(res, token, req);
    return res;
  } catch (e) {
    console.error("register error", e);
    return fail("Unable to create account. Please try again.", 500);
  }
}
