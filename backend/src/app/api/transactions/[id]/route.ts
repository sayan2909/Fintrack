import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories, accounts } from "@/db/schema";
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
  const existing = rows[0];

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    let newType = existing.type;
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) return fail("Invalid type.", 400);
      updates.type = body.type;
      newType = body.type;
    }

    let newAmt = parseFloat(existing.amount);
    if (body.amount !== undefined) {
      const amt = parseAmount(body.amount);
      if (!amt) return fail("Amount must be positive.", 400);
      updates.amount = String(amt);
      newAmt = amt;
    }

    if (body.description !== undefined) {
      if (!String(body.description).trim()) return fail("Description cannot be empty.", 400);
      updates.description = String(body.description).trim();
    }

    if (body.date !== undefined) {
      if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        updates.date = body.date;
      } else {
        const d = new Date(body.date);
        if (Number.isNaN(d.getTime())) return fail("Invalid date.", 400);
        updates.date = d.toISOString().slice(0, 10);
      }
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

    // Account link update
    let targetAccId = existing.accountId;
    if (body.accountId !== undefined) {
      if (body.accountId) {
        const a = await db
          .select()
          .from(accounts)
          .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, user.id)))
          .limit(1);
        if (!a[0]) return fail("Account not found.", 404);
        updates.accountId = a[0].id;
        targetAccId = a[0].id;
      } else {
        updates.accountId = null;
        targetAccId = null;
      }
    }

    // Adjust account balance if needed
    if (
      existing.accountId !== targetAccId ||
      existing.type !== newType ||
      parseFloat(existing.amount) !== newAmt
    ) {
      // Revert old account balance
      if (existing.accountId) {
        const oldAcc = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, existing.accountId))
          .limit(1);
        if (oldAcc[0]) {
          const oldCurBal = parseFloat(oldAcc[0].balance || "0");
          const revDelta = existing.type === "income" ? -parseFloat(existing.amount) : parseFloat(existing.amount);
          await db
            .update(accounts)
            .set({
              balance: String(Math.round((oldCurBal + revDelta) * 100) / 100),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, oldAcc[0].id));
        }
      }
      // Apply to new account balance
      if (targetAccId) {
        const newAcc = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, targetAccId))
          .limit(1);
        if (newAcc[0]) {
          const newCurBal = parseFloat(newAcc[0].balance || "0");
          const applyDelta = newType === "income" ? newAmt : -newAmt;
          await db
            .update(accounts)
            .set({
              balance: String(Math.round((newCurBal + applyDelta) * 100) / 100),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, newAcc[0].id));
        }
      }
    }

    updates.updatedAt = new Date();
    const updated = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

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
  const tx = rows[0];

  try {
    // Revert account balance
    if (tx.accountId) {
      const acc = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).limit(1);
      if (acc[0]) {
        const curBal = parseFloat(acc[0].balance || "0");
        const revDelta = tx.type === "income" ? -parseFloat(tx.amount) : parseFloat(tx.amount);
        await db
          .update(accounts)
          .set({
            balance: String(Math.round((curBal + revDelta) * 100) / 100),
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, acc[0].id));
      }
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return ok({ deleted: true });
  } catch (e) {
    console.error("delete tx error:", e);
    return fail("Unable to delete transaction.", 500);
  }
}
