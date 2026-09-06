import { NextRequest } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.type !== undefined) updates.type = String(body.type);
    if (body.balance !== undefined) updates.balance = String(body.balance);
    if (body.accountNumber !== undefined) updates.accountNumber = body.accountNumber ? String(body.accountNumber).trim() : null;
    if (body.color !== undefined) updates.color = String(body.color);
    if (body.icon !== undefined) updates.icon = String(body.icon);
    if (body.isDefault !== undefined) {
      updates.isDefault = Boolean(body.isDefault);
      if (body.isDefault) {
        await db
          .update(accounts)
          .set({ isDefault: false })
          .where(eq(accounts.userId, user.id));
      }
    }
    updates.updatedAt = new Date();

    const updated = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
      .returning();

    if (updated.length === 0) return fail("Account not found.", 404);
    return ok({ account: updated[0] });
  } catch (err) {
    console.error("[Accounts PUT] Error:", err);
    return fail("Unable to update account.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const existing = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
      .limit(1);

    const wasDefault = existing[0].isDefault;

    // Unlink transactions from this account
    await db
      .update(transactions)
      .set({ accountId: null })
      .where(and(eq(transactions.accountId, id), eq(transactions.userId, user.id)));

    await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

    // If the deleted account was default, designate the next available account as default
    if (wasDefault) {
      const remaining = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, user.id))
        .limit(1);

      if (remaining.length > 0) {
        await db
          .update(accounts)
          .set({ isDefault: true })
          .where(eq(accounts.id, remaining[0].id));
      }
    }

    return ok({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("[Accounts DELETE] Error:", err);
    return fail("Unable to delete account.", 500);
  }
}
