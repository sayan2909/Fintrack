import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, verifyPassword, hashPassword, validatePassword } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function PUT(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();
  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();
    if (!currentPassword || !newPassword) return fail("Current and new passwords are required.", 400);
    const rows = await db.select().from(users).where(eq(users.id, auth.id)).limit(1);
    const full = rows[0];
    if (!full) return unauthorized();
    const valid = await verifyPassword(currentPassword, full.passwordHash);
    if (!valid) return fail("Current password is incorrect.", 400);
    const err = validatePassword(newPassword);
    if (err) return fail(err, 400);
    if (newPassword !== confirmPassword) return fail("New passwords do not match.", 400);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, auth.id));
    return ok({ message: "Password updated successfully." });
  } catch (e) {
    console.error("password change error", e);
    return fail("Unable to change password.", 500);
  }
}
