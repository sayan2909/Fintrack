import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, verifyPassword, clearAuthCookie } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body ?? {};

    if (!password) {
      return fail("Your current password is required to delete your account.", 400);
    }

    // Verify password before irreversible deletion
    const userRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const dbUser = userRows[0];
    if (!dbUser) return fail("User not found.", 404);

    const valid = await verifyPassword(password, dbUser.passwordHash);
    if (!valid) {
      return fail("Incorrect password. Account deletion aborted.", 401);
    }

    // Delete user record (foreign keys cascade to all accounts, transactions, budgets, sessions, etc.)
    await db.delete(users).where(eq(users.id, user.id));

    const res = ok({ message: "Your FinTrack account and all associated data have been permanently deleted." });
    clearAuthCookie(res);
    return res;
  } catch (err) {
    console.error("[Delete Account] Error:", err);
    return fail("Unable to delete account. Please try again.", 500);
  }
}
