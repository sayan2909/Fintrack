import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  accounts,
  categories,
  transactions,
  budgets,
  savingsGoals,
  recurringTransactions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { unauthorized, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const [
      userRows,
      userAccounts,
      userCategories,
      userTransactions,
      userBudgets,
      userGoals,
      userRecurring,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          currency: users.currency,
          theme: users.theme,
          dateFormat: users.dateFormat,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, auth.id))
        .limit(1),
      db.select().from(accounts).where(eq(accounts.userId, auth.id)),
      db.select().from(categories).where(eq(categories.userId, auth.id)),
      db.select().from(transactions).where(eq(transactions.userId, auth.id)),
      db.select().from(budgets).where(eq(budgets.userId, auth.id)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, auth.id)),
      db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, auth.id)),
    ]);

    const exportPayload = {
      app: "FinTrack",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      user: userRows[0] || { id: auth.id, email: auth.email },
      summary: {
        totalAccounts: userAccounts.length,
        totalCategories: userCategories.length,
        totalTransactions: userTransactions.length,
        totalBudgets: userBudgets.length,
        totalGoals: userGoals.length,
        totalRecurringRules: userRecurring.length,
      },
      data: {
        accounts: userAccounts,
        categories: userCategories,
        transactions: userTransactions,
        budgets: userBudgets,
        savingsGoals: userGoals,
        recurringTransactions: userRecurring,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="fintrack-backup-${dateStr}.json"`,
      },
    });
  } catch (err) {
    console.error("Data export error:", err);
    return fail("Unable to generate financial data backup.", 500);
  }
}
