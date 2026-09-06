import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

function fmtDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d"; // 7d|30d|6m|1y|custom
  let from: Date;
  let to = new Date();
  const customFrom = url.searchParams.get("from");
  const customTo = url.searchParams.get("to");
  if (range === "custom" && customFrom && customTo) {
    from = new Date(customFrom);
    to = new Date(customTo);
  } else if (range === "7d") {
    from = new Date(Date.now() - 7 * 86400000);
  } else if (range === "6m") {
    from = new Date();
    from.setMonth(from.getMonth() - 6);
  } else if (range === "1y") {
    from = new Date();
    from.setFullYear(from.getFullYear() - 1);
  } else {
    from = new Date(Date.now() - 30 * 86400000);
  }
  const fromStr = fmtDay(from);
  const toStr = fmtDay(to);

  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), gte(transactions.date, fromStr), lte(transactions.date, toStr)));

  const cats = await db.select().from(categories).where(eq(categories.userId, user.id));
  const colorByName: Record<string, string> = {};
  for (const c of cats) colorByName[c.name.toLowerCase()] = c.color;

  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + parseFloat(t.amount), 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((a, t) => a + parseFloat(t.amount), 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : 0;

  // Time series
  const bucket: Record<string, { income: number; expenses: number }> = {};
  const longRange = range === "6m" || range === "1y";
  for (const t of txs) {
    const d = new Date(t.date);
    let key: string;
    if (longRange) key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    else key = t.date;
    if (!bucket[key]) bucket[key] = { income: 0, expenses: 0 };
    if (t.type === "income") bucket[key].income += parseFloat(t.amount);
    else bucket[key].expenses += parseFloat(t.amount);
  }
  // Fill gaps
  const series: { label: string; income: number; expenses: number; net: number }[] = [];
  if (longRange) {
    const months = range === "1y" ? 12 : 6;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = bucket[key] || { income: 0, expenses: 0 };
      series.push({ label: d.toLocaleString("en", { month: "short" }), income: Math.round(b.income), expenses: Math.round(b.expenses), net: Math.round(b.income - b.expenses) });
    }
  } else {
    const days = range === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = fmtDay(d);
      const b = bucket[key] || { income: 0, expenses: 0 };
      series.push({ label: d.toLocaleString("en", { day: "numeric", month: "short" }), income: Math.round(b.income), expenses: Math.round(b.expenses), net: Math.round(b.income - b.expenses) });
    }
  }

  // Category breakdown (expenses)
  const byCat: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const k = t.categoryName || "Other";
    byCat[k] = (byCat[k] || 0) + parseFloat(t.amount);
  }
  const breakdown = Object.entries(byCat)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, color: colorByName[name.toLowerCase()] || "#64748b" }))
    .sort((a, b) => b.value - a.value);

  const byCatIncome: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== "income") continue;
    const k = t.categoryName || "Other Income";
    byCatIncome[k] = (byCatIncome[k] || 0) + parseFloat(t.amount);
  }
  const incomeBreakdown = Object.entries(byCatIncome)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, color: colorByName[name.toLowerCase()] || "#10b981" }))
    .sort((a, b) => b.value - a.value);

  // Monthly comparison: current vs previous month
  const now = new Date();
  const cmKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pmKey = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}`;
  const pmStart = `${pmKey}-01`;
  const pmEnd = `${pmKey}-${new Date(pm.getFullYear(), pm.getMonth() + 1, 0).getDate()}`;
  const cmStart = `${cmKey}-01`;
  const cmEnd = `${cmKey}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
  const [cmTxs, pmTxs] = await Promise.all([
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, cmStart), lte(transactions.date, cmEnd))),
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, pmStart), lte(transactions.date, pmEnd))),
  ]);
  const sum = (arr: typeof cmTxs, ty: string) => arr.filter((t) => t.type === ty).reduce((a, t) => a + parseFloat(t.amount), 0);
  const monthlyComparison = {
    current: { income: sum(cmTxs, "income"), expenses: sum(cmTxs, "expense") },
    previous: { income: sum(pmTxs, "income"), expenses: sum(pmTxs, "expense") },
  };

  return ok({
    totals: { income, expenses, net, savingsRate, count: txs.length },
    series,
    breakdown,
    incomeBreakdown,
    monthlyComparison,
    range,
    from: fromStr,
    to: toStr,
  });
}
