import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, validateEmail } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail("Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.email !== undefined) {
      const em = String(body.email).trim().toLowerCase();
      if (!validateEmail(em)) return fail("Invalid email address.", 400);
      const existing = await db.select().from(users).where(eq(users.email, em)).limit(1);
      if (existing.length && existing[0].id !== user.id) return fail("Email is already in use.", 409);
      updates.email = em;
    }
    if (body.currency !== undefined) updates.currency = String(body.currency);
    if (body.theme !== undefined) updates.theme = String(body.theme);
    if (body.dateFormat !== undefined) updates.dateFormat = String(body.dateFormat);
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl || null;
    if (body.notifyBudget !== undefined) updates.notifyBudget = !!body.notifyBudget;
    if (body.notifyRecurring !== undefined) updates.notifyRecurring = !!body.notifyRecurring;
    if (body.notifyGoals !== undefined) updates.notifyGoals = !!body.notifyGoals;
    if (body.notifySummary !== undefined) updates.notifySummary = !!body.notifySummary;
    if (body.hasSeenTour !== undefined) updates.hasSeenTour = Boolean(body.hasSeenTour);
    updates.updatedAt = new Date();
    const rows = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
    const { passwordHash: _p, resetToken: _r, resetExpires: _e, ...safe } = rows[0];
    return ok({ user: safe });
  } catch (e) {
    console.error("profile update error", e);
    return fail("Unable to update profile.", 500);
  }
}
