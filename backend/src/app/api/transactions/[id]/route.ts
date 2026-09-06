import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound("Transaction not found.");
  return ok({ transaction: rows[0] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound("Transaction not found.");
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) return fail("Invalid type.", 400);
      updates.type = body.type;
    }
    if (body.amount !== undefined) {
      const amt = parseAmount(body.amount);
      if (!amt) return fail("Amount must be positive.", 400);
      updates.amount = String(amt);
    }
    if (body.description !== undefined) {
      if (!String(body.description).trim()) return fail("Description cannot be empty.", 400);
      updates.description = String(body.description).trim();
    }
    if (body.date !== undefined) {
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) return fail("Invalid date.", 400);
      updates.date = d.toISOString().slice(0, 10);
    }
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updates.notes = body.notes || null;
    if (body.categoryId !== undefined) {
      if (body.categoryId) {
        const c = await db
          .select()
          .from(categories)
          .where(and(eq(categories.id, body.categoryId), eq(categories.userId, user.id)))
          .limit(1);
        if (!c[0]) return fail("Category not found.", 404);
        updates.categoryId = c[0].id;
        updates.categoryName = c[0].name;
      } else {
        updates.categoryId = null;
      }
    }
    if (body.category !== undefined || body.categoryName !== undefined) {
      const nm = body.category ?? body.categoryName;
      if (nm) {
        const c = await db
          .select()
          .from(categories)
          .where(and(eq(categories.userId, user.id), eq(categories.name, String(nm))))
          .limit(1);
        if (c[0]) {
          updates.categoryId = c[0].id;
          updates.categoryName = c[0].name;
        } else {
          updates.categoryName = String(nm);
        }
      }
    }
    updates.updatedAt = new Date();
    const updated = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return ok({ transaction: updated[0] });
  } catch (e) {
    console.error("update tx", e);
    return fail("Unable to update transaction.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound("Transaction not found.");
  await db.delete(transactions).where(eq(transactions.id, id));
  return ok({ deleted: true });
}
