import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return fail("Reset token is required.", 400);
    }
    const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    const user = rows[0];
    if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
      return fail("This password reset link is invalid or has expired.", 400);
    }
    return ok({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (e) {
    console.error("verify reset token error:", e);
    return fail("Unable to verify reset token.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, confirmPassword } = body || {};
    if (!token) return fail("Reset token is required.", 400);
    const pwErr = validatePassword(password ?? "");
    if (pwErr) return fail(pwErr, 400);
    if (password !== confirmPassword) return fail("Passwords do not match.", 400);

    const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    const user = rows[0];
    if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
      return fail("This password reset link is invalid or has expired.", 400);
    }

    await db
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        resetToken: null,
        resetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return ok({ message: "Your password has been reset successfully. You can now sign in with your new password." });
  } catch (e) {
    console.error("reset password error:", e);
    return fail("Unable to reset password.", 500);
  }
}
