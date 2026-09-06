import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const txs = await db.select().from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "income"), gte(transactions.date, from), lte(transactions.date, to)));
  const byCat: Record<string, number> = {};
  let total = 0;
  for (const t of txs) {
    total += parseFloat(t.amount);
    const k = t.categoryName || "Other Income";
    byCat[k] = (byCat[k] || 0) + parseFloat(t.amount);
  }
  return ok({ total, count: txs.length, byCategory: Object.entries(byCat).map(([name, value]) => ({ name, value })), transactions: txs.slice(0, 100) });
}
