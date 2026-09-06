import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, budgets, savingsGoals } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const preset = url.searchParams.get("preset") || "monthly"; // monthly|quarterly|yearly|custom
  let from: string;
  let to: string;
  const now = new Date();
  if (preset === "quarterly") {
    const q = Math.floor(now.getMonth() / 3);
    from = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, "0")}-01`;
    to = now.toISOString().slice(0, 10);
  } else if (preset === "yearly") {
    from = `${now.getFullYear()}-01-01`;
    to = now.toISOString().slice(0, 10);
  } else if (preset === "custom") {
    from = url.searchParams.get("from") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    to = url.searchParams.get("to") || now.toISOString().slice(0, 10);
  } else {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    to = now.toISOString().slice(0, 10);
  }
  if (from > to) return fail("Invalid date range.", 400);

  const [txs, allBudgets, goals] = await Promise.all([
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, from), lte(transactions.date, to))),
    db.select().from(budgets).where(eq(budgets.userId, user.id)),
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
  ]);

  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + parseFloat(t.amount), 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((a, t) => a + parseFloat(t.amount), 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : 0;

  const byCat: Record<string, { income: number; expenses: number; count: number }> = {};
  for (const t of txs) {
    const k = t.categoryName || "Other";
    if (!byCat[k]) byCat[k] = { income: 0, expenses: 0, count: 0 };
    byCat[k].count++;
    if (t.type === "income") byCat[k].income += parseFloat(t.amount);
    else byCat[k].expenses += parseFloat(t.amount);
  }
  const categoryBreakdown = Object.entries(byCat).map(([name, v]) => ({ name, ...v, net: v.income - v.expenses }));

  // Budget performance in range: filter budgets whose month overlaps [from,to]
  const fromMonth = from.slice(0, 7);
  const toMonth = to.slice(0, 7);
  const relevant = allBudgets.filter((b) => b.month >= fromMonth && b.month <= toMonth);
  const budgetPerformance = relevant.map((b) => {
    const spent = txs.filter((t) => t.type === "expense" && (t.categoryName || "").toLowerCase() === (b.categoryName || "").toLowerCase()).reduce((a, t) => a + parseFloat(t.amount), 0);
    const total = parseFloat(b.amount);
    return { ...b, spent, percentUsed: total ? Math.round((spent / total) * 100) : 0 };
  });

  const byMethod: Record<string, number> = {};
  for (const t of txs) byMethod[t.paymentMethod || "Other"] = (byMethod[t.paymentMethod || "Other"] || 0) + 1;

  if (url.searchParams.get("format") === "csv") {
    const header = "Date,Type,Description,Category,Payment Method,Amount,Notes\n";
    const rows = txs.map((t) => {
      const esc = (s: string | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;
      return [t.date, t.type, esc(t.description), esc(t.categoryName), esc(t.paymentMethod), t.amount, esc(t.notes)].join(",");
    });
    const csv = header + rows.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fintrack-report-${from}-to-${to}.csv"`,
      },
    });
  }

  return ok({
    period: { from, to, preset },
    summary: { income, expenses, net, savingsRate, count: txs.length },
    categoryBreakdown,
    budgetPerformance,
    savingsProgress: goals.map((g) => {
      const target = parseFloat(g.targetAmount);
      const cur = parseFloat(g.currentAmount);
      return { ...g, percentComplete: target ? Math.min(100, Math.round((cur / target) * 100)) : 0 };
    }),
    byPaymentMethod: Object.entries(byMethod).map(([name, count]) => ({ name, count })),
    transactions: txs.slice(0, 200),
  });
}
