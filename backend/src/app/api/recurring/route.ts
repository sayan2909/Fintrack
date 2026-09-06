import { NextRequest } from "next/server";
import { db } from "@/db";
import { recurringTransactions, categories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { parseAmount, nextDueDate } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const rows = await db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id));
  const enriched = rows.map((r) => {
    const next = nextDueDate(r.startDate, r.frequency);
    const endOk = !r.endDate || new Date(r.endDate) >= new Date();
    return {
      ...r,
      nextDue: next.toISOString().slice(0, 10),
      upcoming: r.isActive && endOk,
      daysUntil: Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000)),
    };
  });
  enriched.sort((a, b) => a.daysUntil - b.daysUntil);
  const monthlyOut = enriched.filter((r) => r.type === "expense" && r.isActive).reduce((acc, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    const m = f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt;
    return acc + m;
  }, 0);
  const monthlyIn = enriched.filter((r) => r.type === "income" && r.isActive).reduce((acc, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    const m = f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt;
    return acc + m;
  }, 0);
  return ok({ recurring: enriched, summary: { monthlyIn, monthlyOut, count: enriched.length } });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
    const { name, amount, type, categoryId, categoryName, frequency, startDate, endDate, paymentMethod } = body ?? {};
    if (!name?.trim()) return fail("Name is required.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail("Amount must be positive.", 400);
    if (!["income", "expense"].includes(type)) return fail("Type must be income or expense.", 400);
    if (!["Daily", "Weekly", "Monthly", "Yearly"].includes(frequency)) return fail("Invalid frequency.", 400);
    if (!startDate) return fail("Start date is required.", 400);
    const s = new Date(startDate);
    if (Number.isNaN(s.getTime())) return fail("Invalid start date.", 400);
    let e: string | null = null;
    if (endDate) {
      const ed = new Date(endDate);
      if (Number.isNaN(ed.getTime())) return fail("Invalid end date.", 400);
      if (ed < s) return fail("End date cannot be before start date.", 400);
      e = ed.toISOString().slice(0, 10);
    }
    let catId: string | null = categoryId || null;
    let catName: string | null = categoryName || null;
    if (catId) {
      const c = await db.select().from(categories).where(and(eq(categories.id, catId), eq(categories.userId, user.id))).limit(1);
      if (c[0]) catName = c[0].name;
      else catId = null;
    }
    const rows = await db
      .insert(recurringTransactions)
      .values({
        userId: user.id,
        name: name.trim(),
        amount: String(amt),
        type,
        categoryId: catId,
        categoryName: catName,
        frequency,
        startDate: s.toISOString().slice(0, 10),
        endDate: e,
        paymentMethod: paymentMethod || "Bank Transfer",
        isActive: true,
      })
      .returning();
    return ok({ recurring: rows[0] }, 201);
  } catch (e2) {
    console.error("create recurring", e2);
    return fail("Unable to create recurring transaction.", 500);
  }
}
