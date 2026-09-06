import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  transactions,
  budgets,
  savingsGoals,
  recurringTransactions,
  notifications,
  accounts,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirmation !== "RESET DATA") {
      return fail('Please type "RESET DATA" to confirm erasing your financial records.', 400);
    }

    // Erase all user transactional data
    await Promise.all([
      db.delete(transactions).where(eq(transactions.userId, user.id)),
      db.delete(budgets).where(eq(budgets.userId, user.id)),
      db.delete(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.delete(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
      db.delete(notifications).where(eq(notifications.userId, user.id)),
      db.delete(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.isDefault, false))),
    ]);

    // Reset remaining default accounts to 0 balance
    await db
      .update(accounts)
      .set({ balance: "0.00", updatedAt: new Date() })
      .where(eq(accounts.userId, user.id));

    return ok({ message: "All financial records have been reset successfully." });
  } catch (err) {
    console.error("[Purge Data] Error:", err);
    return fail("Unable to reset financial records.", 500);
  }
}
