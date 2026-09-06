import { NextRequest } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { fromAccountId, toAccountId, amount, date, description } = body ?? {};

    const transferAmount = Number(amount);
    if (!fromAccountId || !toAccountId) {
      return fail("Both source and destination accounts are required.", 400);
    }
    if (fromAccountId === toAccountId) {
      return fail("Source and destination accounts must be different.", 400);
    }
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return fail("Transfer amount must be greater than zero.", 400);
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
      return fail("One or both accounts could not be found.", 404);
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

    // Record paired transactions
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

    return ok({
      message: "Transfer completed successfully.",
      fromAccount: { ...fromAcc, balance: newFromBal },
      toAccount: { ...toAcc, balance: newToBal },
    });
  } catch (err) {
    console.error("[Accounts Transfer] Error:", err);
    return fail("Unable to complete account transfer.", 500);
  }
}
