import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const [txs, cats] = await Promise.all([
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, from), lte(transactions.date, to))),
    db.select().from(categories).where(eq(categories.userId, user.id)),
  ]);
  const colorBy: Record<string, string> = {};
  for (const c of cats) colorBy[c.name.toLowerCase()] = c.color;
  const map: Record<string, { income: number; expenses: number; count: number }> = {};
  for (const t of txs) {
    const k = t.categoryName || "Other";
    if (!map[k]) map[k] = { income: 0, expenses: 0, count: 0 };
    map[k].count++;
    if (t.type === "income") map[k].income += parseFloat(t.amount);
    else map[k].expenses += parseFloat(t.amount);
  }
  const data = Object.entries(map).map(([name, v]) => ({ name, ...v, color: colorBy[name.toLowerCase()] || "#64748b" })).sort((a, b) => b.expenses - a.expenses);
  return ok({ categories: data });
}
