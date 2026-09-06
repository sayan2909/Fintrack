import { NextRequest } from "next/server";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { parseAmount, pushNotification } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const all = await db.select().from(budgets).where(eq(budgets.userId, user.id));
  const filtered = month === "all" ? all : all.filter((b) => b.month === month);

  const [y, m] = (month === "all" ? new Date().toISOString().slice(0, 7) : month).split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), gte(transactions.date, start), lte(transactions.date, end)));

  const spentByCat: Record<string, number> = {};
  for (const t of txs) {
    const k = (t.categoryName || "Other").toLowerCase();
    spentByCat[k] = (spentByCat[k] || 0) + parseFloat(t.amount);
  }

  const enriched = filtered.map((b) => {
    const spent = spentByCat[(b.categoryName || "").toLowerCase()] || 0;
    const total = parseFloat(b.amount);
    const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
    const remaining = total - spent;
    const status = pct >= 100 ? "over" : pct >= 80 ? "warning" : "healthy";
    return { ...b, spent, remaining, percentUsed: pct, status };
  });

  const totalBudget = enriched.reduce((a, b) => a + parseFloat(b.amount), 0);
  const totalSpent = enriched.reduce((a, b) => a + b.spent, 0);

  return ok({
    budgets: enriched,
    summary: { totalBudget, totalSpent, remaining: totalBudget - totalSpent, percentUsed: totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0 },
    month,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const { categoryId, category, categoryName, amount, month, description } = await req.json();
    const catName = (category || categoryName || "").trim();
    if (!catName && !categoryId) return fail("Category is required.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail("Amount must be positive.", 400);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return fail("Month must be YYYY-MM.", 400);

    let finalCatId: string | null = categoryId || null;
    let finalName = catName;
    if (finalCatId) {
      const c = await db.select().from(categories).where(and(eq(categories.id, finalCatId), eq(categories.userId, user.id))).limit(1);
      if (!c[0]) return fail("Category not found.", 404);
      finalName = c[0].name;
    } else if (finalName) {
      const c = await db.select().from(categories).where(and(eq(categories.userId, user.id), eq(categories.name, finalName))).limit(1);
      if (c[0]) finalCatId = c[0].id;
    }

    const dup = await db.select().from(budgets).where(and(eq(budgets.userId, user.id), eq(budgets.categoryName, finalName), eq(budgets.month, month))).limit(1);
    if (dup.length) return fail(`A budget for ${finalName} already exists for ${month}.`, 409);

    const rows = await db.insert(budgets).values({ userId: user.id, categoryId: finalCatId, categoryName: finalName, amount: String(amt), month, description: description || null }).returning();
    return ok({ budget: { ...rows[0], spent: 0, remaining: amt, percentUsed: 0, status: "healthy" } }, 201);
  } catch (e) {
    console.error("create budget", e);
    return fail("Unable to create budget.", 500);
  }
}
