import { NextRequest } from "next/server";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Goal not found.");
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail("Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.targetAmount !== undefined) {
      const t = parseAmount(body.targetAmount);
      if (!t) return fail("Target must be positive.", 400);
      updates.targetAmount = String(t);
    }
    if (body.currentAmount !== undefined) {
      const c = parseFloat(body.currentAmount);
      if (Number.isNaN(c) || c < 0) return fail("Current amount invalid.", 400);
      updates.currentAmount = String(c);
    }
    if (body.targetDate !== undefined) {
      if (!body.targetDate) updates.targetDate = null;
      else {
        const d = new Date(body.targetDate);
        if (Number.isNaN(d.getTime())) return fail("Invalid date.", 400);
        updates.targetDate = d.toISOString().slice(0, 10);
      }
    }
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.color !== undefined) updates.color = body.color;
    updates.updatedAt = new Date();
    const updated = await db.update(savingsGoals).set(updates).where(eq(savingsGoals.id, id)).returning();
    return ok({ goal: updated[0] });
  } catch (e) {
    console.error("update goal", e);
    return fail("Unable to update goal.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Goal not found.");
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  return ok({ deleted: true });
}
