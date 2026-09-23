import { Router } from "express";
import { db } from "@/db";
import { transactions, budgets, savingsGoals, recurringTransactions, accounts } from "@/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { nextDueDate } from "@/lib/server-utils";

const router = Router();

// GET /api/dashboard
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  const now = new Date();
  const cmKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pmKey = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}`;
  const cmStart = `${cmKey}-01`;
  const cmEnd = `${cmKey}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
  const pmStart = `${pmKey}-01`;
  const pmEnd = `${pmKey}-${new Date(pm.getFullYear(), pm.getMonth() + 1, 0).getDate()}`;

  const [allTxs, cmTxs, pmTxs, monthBudgets, goals, recent, recs, userAccounts] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.userId, user.id)),
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, cmStart), lte(transactions.date, cmEnd))),
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, pmStart), lte(transactions.date, pmEnd))),
    db.select().from(budgets).where(and(eq(budgets.userId, user.id), eq(budgets.month, cmKey))),
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
    db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date)).limit(6),
    db.select().from(recurringTransactions).where(and(eq(recurringTransactions.userId, user.id), eq(recurringTransactions.isActive, true))),
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
  ]);

  const sum = (arr: typeof allTxs, ty: string) => arr.filter((t) => t.type === ty).reduce((a, t) => a + parseFloat(t.amount), 0);
  const totalIncome = sum(allTxs, "income");
  const totalExpenses = sum(allTxs, "expense");
  const balance = totalIncome - totalExpenses;

  const cmIncome = sum(cmTxs, "income");
  const cmExpenses = sum(cmTxs, "expense");
  const pmIncome = sum(pmTxs, "income");
  const pmExpenses = sum(pmTxs, "expense");
  const pmBalance = pmIncome - pmExpenses;
  const cmBalance = cmIncome - cmExpenses;

  const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10);

  const totalSavings = goals.reduce((a, g) => a + parseFloat(g.currentAmount), 0);
  const savingsRate = cmIncome > 0 ? Math.round(((cmIncome - cmExpenses) / cmIncome) * 1000) / 10 : 0;

  const spentByCat: Record<string, number> = {};
  for (const t of cmTxs) {
    if (t.type !== "expense") continue;
    const k = (t.categoryName || "").toLowerCase();
    spentByCat[k] = (spentByCat[k] || 0) + parseFloat(t.amount);
  }
  const budgetOverview = monthBudgets.map((b) => {
    const spent = spentByCat[(b.categoryName || "").toLowerCase()] || 0;
    const total = parseFloat(b.amount);
    const pct = total ? Math.round((spent / total) * 100) : 0;
    return { ...b, spent, remaining: total - spent, percentUsed: pct, status: pct >= 100 ? "over" : pct >= 80 ? "warning" : "healthy" };
  });

  const byCat: Record<string, number> = {};
  for (const t of cmTxs) {
    if (t.type !== "expense") continue;
    const k = t.categoryName || "Other";
    byCat[k] = (byCat[k] || 0) + parseFloat(t.amount);
  }
  const breakdown = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const series: { label: string; income: number; expenses: number; net: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayTxs = allTxs.filter((t) => t.date === key);
    const inc = dayTxs.filter((t) => t.type === "income").reduce((a, t) => a + parseFloat(t.amount), 0);
    const exp = dayTxs.filter((t) => t.type === "expense").reduce((a, t) => a + parseFloat(t.amount), 0);
    series.push({ label: d.toLocaleString("en", { day: "numeric", month: "short" }), income: inc, expenses: exp, net: inc - exp });
  }

  const goalsEnriched = goals.slice(0, 4).map((g) => {
    const target = parseFloat(g.targetAmount);
    const cur = parseFloat(g.currentAmount);
    return { ...g, percentComplete: target ? Math.min(100, Math.round((cur / target) * 100)) : 0 };
  });

  const upcomingPayments = recs
    .map((r) => {
      const next = nextDueDate(r.startDate, r.frequency);
      const diffMs = next.getTime() - Date.now();
      const daysUntil = Math.ceil(diffMs / 86400000);
      return {
        id: r.id,
        name: r.name,
        amount: parseFloat(r.amount),
        type: r.type,
        categoryName: r.categoryName,
        frequency: r.frequency,
        paymentMethod: r.paymentMethod,
        dueDate: next.toISOString().slice(0, 10),
        daysUntil,
        isDueToday: daysUntil === 0,
        isDueTomorrow: daysUntil === 1,
        isDueSoon: daysUntil >= 0 && daysUntil <= 7,
      };
    })
    .filter((p) => p.isDueSoon)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // ── Executive Financial Health & Runway Intelligence ────────
  const liquidReserves = userAccounts.length > 0
    ? userAccounts
        .filter((a) => a.type !== "credit_card")
        .reduce((sum, a) => sum + Math.max(0, parseFloat(a.balance || "0")), 0)
    : Math.max(0, balance);

  // 3-month rolling average burn rate
  const expSamples = [cmExpenses, pmExpenses].filter((e) => e > 0);
  const avgMonthlyBurn = expSamples.length > 0
    ? Math.round((expSamples.reduce((a, b) => a + b, 0) / expSamples.length) * 100) / 100
    : cmExpenses > 0 ? cmExpenses : 1500;

  const runwayMonths = avgMonthlyBurn > 0
    ? Math.round((liquidReserves / avgMonthlyBurn) * 10) / 10
    : 99.9;

  const targetBuffer = Math.round(avgMonthlyBurn * 6);
  const emergencyFundHealth = targetBuffer > 0
    ? Math.min(100, Math.round((liquidReserves / targetBuffer) * 100))
    : 100;

  const runwayStatus: "optimal" | "adequate" | "caution" =
    runwayMonths >= 6 ? "optimal" : runwayMonths >= 3 ? "adequate" : "caution";

  const runway = {
    liquidReserves,
    avgMonthlyBurn,
    runwayMonths,
    targetBuffer,
    emergencyFundHealth,
    status: runwayStatus,
  };

  return ok(res, {
    cards: {
      balance: { value: balance, change: pctChange(cmBalance, pmBalance) },
      income: { value: cmIncome, change: pctChange(cmIncome, pmIncome) },
      expenses: { value: cmExpenses, change: pctChange(cmExpenses, pmExpenses) },
      savings: { value: totalSavings, rate: savingsRate },
    },
    runway,
    series,
    breakdown,
    budgets: budgetOverview,
    goals: goalsEnriched,
    recent,
    upcomingPayments,
    month: cmKey,
  });
});

export default router;
