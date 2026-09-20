import { NextRequest } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .orderBy(desc(accounts.isDefault), desc(accounts.createdAt));

    return ok({ accounts: userAccounts });
  } catch (err) {
    console.error("[Accounts GET] Error:", err);
    return fail("Unable to fetch accounts.", 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { name, type, balance, accountNumber, color, icon, isDefault } = body ?? {};

    if (!name?.trim()) return fail("Account name is required.", 400);

    // If set as default, reset other accounts
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

    return ok({ account: inserted[0] }, 201);
  } catch (err) {
    console.error("[Accounts POST] Error:", err);
    return fail("Unable to create account.", 500);
  }
}
