import { NextRequest } from "next/server";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Budget not found.");
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.amount !== undefined) {
      const amt = parseAmount(body.amount);
      if (!amt) return fail("Amount must be positive.", 400);
      updates.amount = String(amt);
    }
    if (body.categoryName !== undefined || body.category !== undefined) {
      updates.categoryName = String(body.categoryName ?? body.category);
    }
    if (body.month !== undefined) {
      if (!/^\d{4}-\d{2}$/.test(body.month)) return fail("Invalid month.", 400);
      updates.month = body.month;
    }
    if (body.description !== undefined) updates.description = body.description || null;
    const updated = await db.update(budgets).set(updates).where(eq(budgets.id, id)).returning();
    return ok({ budget: updated[0] });
  } catch (e) {
    console.error("update budget", e);
    return fail("Unable to update budget.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Budget not found.");
  await db.delete(budgets).where(eq(budgets.id, id));
  return ok({ deleted: true });
}
