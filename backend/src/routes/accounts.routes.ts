import { Router } from "express";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

const router = Router();

// GET /api/accounts
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .orderBy(desc(accounts.isDefault), desc(accounts.createdAt));

    return ok(res, { accounts: userAccounts });
  } catch (err) {
    console.error("[Accounts GET] Error:", err);
    return fail(res, "Unable to fetch accounts.", 500);
  }
});

// POST /api/accounts
router.post("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const { name, type, balance, accountNumber, color, icon, isDefault } = req.body ?? {};

    if (!name?.trim()) return fail(res, "Account name is required.", 400);

    if (isDefault) {
      await db
        .update(accounts)
        .set({ isDefault: false })
        .where(eq(accounts.userId, user.id));
    }

    const inserted = await db
      .insert(accounts)
      .values({
        userId: user.id,
        name: name.trim(),
        type: type || "Bank Account",
        balance: String(balance || "0"),
        accountNumber: accountNumber ? String(accountNumber).trim() : null,
        color: color || "#6366f1",
        icon: icon || "Building2",
        isDefault: Boolean(isDefault),
      })
      .returning();

    return ok(res, { account: inserted[0] }, 201);
  } catch (err) {
    console.error("[Accounts POST] Error:", err);
    return fail(res, "Unable to create account.", 500);
  }
});

// POST /api/accounts/transfer
router.post("/transfer", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const { fromAccountId, toAccountId, amount, date, description } = req.body ?? {};

    const transferAmount = Number(amount);
    if (!fromAccountId || !toAccountId) {
      return fail(res, "Both source and destination accounts are required.", 400);
    }
    if (fromAccountId === toAccountId) {
      return fail(res, "Source and destination accounts must be different.", 400);
    }
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return fail(res, "Transfer amount must be greater than zero.", 400);
    }

    const fromAccRows = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, fromAccountId), eq(accounts.userId, user.id)))
      .limit(1);

    const toAccRows = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, toAccountId), eq(accounts.userId, user.id)))
      .limit(1);

    if (fromAccRows.length === 0 || toAccRows.length === 0) {
      return fail(res, "One or both accounts could not be found.", 404);
    }

    const fromAcc = fromAccRows[0];
    const toAcc = toAccRows[0];

    const newFromBal = (Number(fromAcc.balance) - transferAmount).toFixed(2);
    const newToBal = (Number(toAcc.balance) + transferAmount).toFixed(2);

    await db
      .update(accounts)
      .set({ balance: newFromBal, updatedAt: new Date() })
      .where(eq(accounts.id, fromAcc.id));

    await db
      .update(accounts)
      .set({ balance: newToBal, updatedAt: new Date() })
      .where(eq(accounts.id, toAcc.id));

    const transferDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const desc = description?.trim() || `Transfer from ${fromAcc.name} to ${toAcc.name}`;

    await db.insert(transactions).values([
      {
        userId: user.id,
        accountId: fromAcc.id,
        type: "expense",
        amount: String(transferAmount),
        description: `Transfer Out: ${desc}`,
        date: transferDate,
        paymentMethod: fromAcc.type,
      },
      {
        userId: user.id,
        accountId: toAcc.id,
        type: "income",
        amount: String(transferAmount),
        description: `Transfer In: ${desc}`,
        date: transferDate,
        paymentMethod: toAcc.type,
      },
    ]);

    return ok(res, {
      message: "Transfer completed successfully.",
      fromAccount: { ...fromAcc, balance: newFromBal },
      toAccount: { ...toAcc, balance: newToBal },
    });
  } catch (err) {
    console.error("[Accounts Transfer] Error:", err);
    return fail(res, "Unable to complete account transfer.", 500);
  }
});

// PUT /api/accounts/:id
router.put("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;

  try {
    const body = req.body;
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

    if (updated.length === 0) return fail(res, "Account not found.", 404);
    return ok(res, { account: updated[0] });
  } catch (err) {
    console.error("[Accounts PUT] Error:", err);
    return fail(res, "Unable to update account.", 500);
  }
});

// DELETE /api/accounts/:id
router.delete("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;

  try {
    const existing = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
      .limit(1);

    if (!existing[0]) return fail(res, "Account not found.", 404);
    const wasDefault = existing[0].isDefault;

    await db
      .update(transactions)
      .set({ accountId: null })
      .where(and(eq(transactions.accountId, id), eq(transactions.userId, user.id)));

    await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

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

    return ok(res, { message: "Account deleted successfully." });
  } catch (err) {
    console.error("[Accounts DELETE] Error:", err);
    return fail(res, "Unable to delete account.", 500);
  }
});

export default router;
