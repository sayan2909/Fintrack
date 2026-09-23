import { Router } from "express";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

const router = Router();

function fmtDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

// GET /api/analytics/overview
router.get("/overview", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  const range = (req.query.range as string) || "30d";
  let from: Date;
  let to = new Date();
  const customFrom = req.query.from as string | undefined;
  const customTo = req.query.to as string | undefined;

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

  return ok(res, {
    totals: { income, expenses, net, savingsRate, count: txs.length },
    series,
    breakdown,
    incomeBreakdown,
    monthlyComparison,
    range,
    from: fromStr,
    to: toStr,
  });
});

// GET /api/analytics/income
router.get("/income", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const from = (req.query.from as string) || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);
  const txs = await db.select().from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "income"), gte(transactions.date, from), lte(transactions.date, to)));
  const byCat: Record<string, number> = {};
  let total = 0;
  for (const t of txs) {
    total += parseFloat(t.amount);
    const k = t.categoryName || "Other Income";
    byCat[k] = (byCat[k] || 0) + parseFloat(t.amount);
  }
  return ok(res, { total, count: txs.length, byCategory: Object.entries(byCat).map(([name, value]) => ({ name, value })), transactions: txs.slice(0, 100) });
});

// GET /api/analytics/expenses
router.get("/expenses", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const from = (req.query.from as string) || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);
  const txs = await db.select().from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), gte(transactions.date, from), lte(transactions.date, to)));
  const byCat: Record<string, number> = {};
  let total = 0;
  for (const t of txs) {
    total += parseFloat(t.amount);
    const k = t.categoryName || "Other";
    byCat[k] = (byCat[k] || 0) + parseFloat(t.amount);
  }
  return ok(res, { total, count: txs.length, byCategory: Object.entries(byCat).map(([name, value]) => ({ name, value })), transactions: txs.slice(0, 100) });
});

// GET /api/analytics/categories
router.get("/categories", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const from = (req.query.from as string) || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);
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
  return ok(res, { categories: data });
});

// GET /api/analytics/yoy
router.get("/yoy", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const currentYear = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const previousYear = currentYear - 1;

    const startOfPrevYear = `${previousYear}-01-01`;
    const endOfCurrentYear = `${currentYear}-12-31`;

    const txRows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, startOfPrevYear),
          lte(transactions.date, endOfCurrentYear)
        )
      );

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthlyData = monthNames.map((month, idx) => ({
      month,
      monthIndex: idx + 1,
      currentYear: {
        year: currentYear,
        expenses: 0,
        income: 0,
        net: 0,
      },
      previousYear: {
        year: previousYear,
        expenses: 0,
        income: 0,
        net: 0,
      },
      expenseDiff: 0,
      expenseDiffPct: 0,
    }));

    let curTotalExp = 0;
    let curTotalInc = 0;
    let prevTotalExp = 0;
    let prevTotalInc = 0;

    for (const tx of txRows) {
      const txDate = new Date(tx.date);
      const yr = txDate.getFullYear();
      const mIdx = txDate.getMonth();
      const amt = Number(tx.amount);

      if (yr === currentYear && mIdx >= 0 && mIdx < 12) {
        if (tx.type === "expense") {
          monthlyData[mIdx].currentYear.expenses += amt;
          curTotalExp += amt;
        } else {
          monthlyData[mIdx].currentYear.income += amt;
          curTotalInc += amt;
        }
      } else if (yr === previousYear && mIdx >= 0 && mIdx < 12) {
        if (tx.type === "expense") {
          monthlyData[mIdx].previousYear.expenses += amt;
          prevTotalExp += amt;
        } else {
          monthlyData[mIdx].previousYear.income += amt;
          prevTotalInc += amt;
        }
      }
    }

    for (const m of monthlyData) {
      m.currentYear.net = m.currentYear.income - m.currentYear.expenses;
      m.previousYear.net = m.previousYear.income - m.previousYear.expenses;
      m.expenseDiff = m.currentYear.expenses - m.previousYear.expenses;
      m.expenseDiffPct = m.previousYear.expenses > 0
        ? Math.round(((m.currentYear.expenses - m.previousYear.expenses) / m.previousYear.expenses) * 100)
        : m.currentYear.expenses > 0 ? 100 : 0;
    }

    const expGrowthPct = prevTotalExp > 0
      ? Math.round(((curTotalExp - prevTotalExp) / prevTotalExp) * 100)
      : curTotalExp > 0 ? 100 : 0;

    const incGrowthPct = prevTotalInc > 0
      ? Math.round(((curTotalInc - prevTotalInc) / prevTotalInc) * 100)
      : curTotalInc > 0 ? 100 : 0;

    return ok(res, {
      currentYear,
      previousYear,
      totals: {
        currentYear: { expenses: curTotalExp, income: curTotalInc, net: curTotalInc - curTotalExp },
        previousYear: { expenses: prevTotalExp, income: prevTotalInc, net: prevTotalInc - prevTotalExp },
        expenseGrowthPct: expGrowthPct,
        incomeGrowthPct: incGrowthPct,
      },
      monthly: monthlyData,
    });
  } catch (err) {
    console.error("[Analytics YoY] Error:", err);
    return fail(res, "Unable to calculate year-over-year comparison.", 500);
  }
});

export default router;
