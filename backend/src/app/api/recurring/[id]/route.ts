import { NextRequest } from "next/server";
import { db } from "@/db";
import { recurringTransactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Recurring transaction not found.");
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail("Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.amount !== undefined) {
      const a = parseAmount(body.amount);
      if (!a) return fail("Amount must be positive.", 400);
      updates.amount = String(a);
    }
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) return fail("Invalid type.", 400);
      updates.type = body.type;
    }
    if (body.frequency !== undefined) {
      if (!["Daily", "Weekly", "Monthly", "Yearly"].includes(body.frequency)) return fail("Invalid frequency.", 400);
      updates.frequency = body.frequency;
    }
    if (body.startDate !== undefined) {
      const d = new Date(body.startDate);
      if (Number.isNaN(d.getTime())) return fail("Invalid start date.", 400);
      updates.startDate = d.toISOString().slice(0, 10);
    }
    if (body.endDate !== undefined) {
      if (!body.endDate) updates.endDate = null;
      else {
        const d = new Date(body.endDate);
        if (Number.isNaN(d.getTime())) return fail("Invalid end date.", 400);
        updates.endDate = d.toISOString().slice(0, 10);
      }
    }
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.categoryName !== undefined) updates.categoryName = body.categoryName || null;
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;
    const updated = await db.update(recurringTransactions).set(updates).where(eq(recurringTransactions.id, id)).returning();
    return ok({ recurring: updated[0] });
  } catch (e) {
    console.error("update recurring", e);
    return fail("Unable to update.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Recurring transaction not found.");
  await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
  return ok({ deleted: true });
}
