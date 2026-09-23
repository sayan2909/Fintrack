import { Router } from "express";
import { db } from "@/db";
import { transactions, budgets, savingsGoals, recurringTransactions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

const router = Router();

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  AED: "AED ",
};

function formatMoney(amount: number, currency = "INR"): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] || "₹";
  const abs = Math.abs(Math.round(amount));
  return `${amount < 0 ? "-" : ""}${sym}${abs.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
}

// GET /api/insights
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  const currency = user.currency || "INR";
  const now = new Date();
  const cmKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pmKey = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}`;
  const cmStart = `${cmKey}-01`;
  const cmEnd = `${cmKey}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
  const pmStart = `${pmKey}-01`;
  const pmEnd = `${pmKey}-${new Date(pm.getFullYear(), pm.getMonth() + 1, 0).getDate()}`;

  const [cmTxs, pmTxs, monthBudgets, goals, recs] = await Promise.all([
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, cmStart), lte(transactions.date, cmEnd))),
    db.select().from(transactions).where(and(eq(transactions.userId, user.id), gte(transactions.date, pmStart), lte(transactions.date, pmEnd))),
    db.select().from(budgets).where(and(eq(budgets.userId, user.id), eq(budgets.month, cmKey))),
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
    db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
  ]);

  interface InsightItem {
    id: string;
    type: "positive" | "warning" | "danger" | "info";
    title: string;
    message: string;
    icon: string;
    category: "spending" | "budget" | "goals" | "recurring" | "savings";
    impact: "high" | "medium" | "low";
    actionUrl: string;
    actionText: string;
  }

  const insights: InsightItem[] = [];

  const sumByCat = (arr: typeof cmTxs) => {
    const m: Record<string, number> = {};
    for (const t of arr) {
      if (t.type !== "expense") continue;
      const k = t.categoryName || "Other";
      m[k] = (m[k] || 0) + parseFloat(t.amount);
    }
    return m;
  };
  const cmCats = sumByCat(cmTxs);
  const pmCats = sumByCat(pmTxs);
  const allCats = new Set([...Object.keys(cmCats), ...Object.keys(pmCats)]);
  
  let catIndex = 0;
  for (const cat of allCats) {
    catIndex++;
    const cur = cmCats[cat] || 0;
    const prev = pmCats[cat] || 0;
    if (prev > 0 && cur > 0) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      if (pct >= 15) {
        insights.push({
          id: `spend-up-${catIndex}`,
          type: "warning",
          category: "spending",
          impact: pct >= 30 ? "high" : "medium",
          title: `${cat} spending up ${pct}%`,
          message: `Your ${cat.toLowerCase()} spending increased by ${pct}% compared with last month (${formatMoney(prev, currency)} → ${formatMoney(cur, currency)}).`,
          icon: "TrendingUp",
          actionUrl: "/analytics",
          actionText: "Inspect Spending",
        });
      } else if (pct <= -15) {
        insights.push({
          id: `spend-down-${catIndex}`,
          type: "positive",
          category: "spending",
          impact: "medium",
          title: `${cat} spending down ${Math.abs(pct)}%`,
          message: `Great job! Your ${cat.toLowerCase()} spending decreased by ${Math.abs(pct)}% compared with last month.`,
          icon: "TrendingDown",
          actionUrl: "/analytics",
          actionText: "View Category Trends",
        });
      }
    } else if (cur > 0 && prev === 0) {
      insights.push({
        id: `spend-new-${catIndex}`,
        type: "info",
        category: "spending",
        impact: "low",
        title: `New spending in ${cat}`,
        message: `You spent ${formatMoney(cur, currency)} on ${cat.toLowerCase()} this month, with no spending recorded there last month.`,
        icon: "Sparkles",
        actionUrl: "/transactions",
        actionText: "View Transactions",
      });
    }
  }

  let totalBudget = 0;
  let totalBudgetSpent = 0;
  let exceededBudgetsCount = 0;

  for (let i = 0; i < monthBudgets.length; i++) {
    const b = monthBudgets[i];
    const spent = cmCats[b.categoryName] || 0;
    const total = parseFloat(b.amount);
    totalBudget += total;
    totalBudgetSpent += spent;
    const pct = total ? Math.round((spent / total) * 100) : 0;
    if (pct >= 100) {
      exceededBudgetsCount++;
      insights.push({
        id: `budget-exceeded-${i}`,
        type: "danger",
        category: "budget",
        impact: "high",
        title: `${b.categoryName} budget exceeded`,
        message: `You have used ${pct}% of your ${b.categoryName.toLowerCase()} budget (${formatMoney(spent, currency)} / ${formatMoney(total, currency)}).`,
        icon: "AlertTriangle",
        actionUrl: "/budgets",
        actionText: "Adjust Budget",
      });
    } else if (pct >= 80) {
      insights.push({
        id: `budget-warn-${i}`,
        type: "warning",
        category: "budget",
        impact: "medium",
        title: `${b.categoryName} budget at ${pct}%`,
        message: `You have used ${pct}% of your ${b.categoryName.toLowerCase()} budget. ${formatMoney(Math.max(0, total - spent), currency)} remaining.`,
        icon: "Gauge",
        actionUrl: "/budgets",
        actionText: "Review Budget",
      });
    }
  }

  const budgetUtilization = totalBudget > 0 ? Math.round((totalBudgetSpent / totalBudget) * 100) : 0;

  const sum = (arr: typeof cmTxs, ty: string) => arr.filter((t) => t.type === ty).reduce((a, t) => a + parseFloat(t.amount), 0);
  const cmInc = sum(cmTxs, "income");
  const cmExp = sum(cmTxs, "expense");
  const pmInc = sum(pmTxs, "income");
  const pmExp = sum(pmTxs, "expense");
  const cmRate = cmInc > 0 ? ((cmInc - cmExp) / cmInc) * 100 : 0;
  const pmRate = pmInc > 0 ? ((pmInc - pmExp) / pmInc) * 100 : 0;

  if (cmInc > 0 || pmInc > 0) {
    const diff = Math.round((cmRate - pmRate) * 10) / 10;
    if (diff > 2) {
      insights.push({
        id: "savings-rate-improved",
        type: "positive",
        category: "savings",
        impact: "high",
        title: "Savings rate improved",
        message: `Your savings rate improved to ${Math.round(cmRate)}% compared with ${Math.round(pmRate)}% last month. Keep up the strong discipline!`,
        icon: "PiggyBank",
        actionUrl: "/analytics",
        actionText: "View Cashflow Breakdown",
      });
    } else if (diff < -2) {
      insights.push({
        id: "savings-rate-declined",
        type: "warning",
        category: "savings",
        impact: "high",
        title: "Savings rate declined",
        message: `Your savings rate dropped to ${Math.round(cmRate)}% from ${Math.round(pmRate)}% last month. Review discretionary expenses.`,
        icon: "PiggyBank",
        actionUrl: "/analytics",
        actionText: "Optimize Cashflow",
      });
    } else {
      insights.push({
        id: "savings-rate-steady",
        type: "info",
        category: "savings",
        impact: "low",
        title: `Savings rate steady at ${Math.round(cmRate)}%`,
        message: `You saved ${Math.round(cmRate)}% of your earned income this month (${formatMoney(Math.max(0, cmInc - cmExp), currency)} retained).`,
        icon: "PiggyBank",
        actionUrl: "/analytics",
        actionText: "Explore Analytics",
      });
    }
  }

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const target = parseFloat(g.targetAmount);
    const cur = parseFloat(g.currentAmount);
    const pct = target ? Math.round((cur / target) * 100) : 0;
    if (pct >= 100) {
      insights.push({
        id: `goal-complete-${i}`,
        type: "positive",
        category: "goals",
        impact: "high",
        title: `Goal "${g.name}" complete! 🎉`,
        message: `Outstanding achievement! "${g.name}" has reached 100% target (${formatMoney(cur, currency)}).`,
        icon: "Trophy",
        actionUrl: "/goals",
        actionText: "Manage Goals",
      });
    } else if (pct >= 50) {
      insights.push({
        id: `goal-ontrack-${i}`,
        type: "positive",
        category: "goals",
        impact: "medium",
        title: `On track: ${g.name}`,
        message: `You are currently ${pct}% toward your ${g.name.toLowerCase()} savings goal (${formatMoney(cur, currency)} of ${formatMoney(target, currency)}).`,
        icon: "Target",
        actionUrl: "/goals",
        actionText: "Boost Goal",
      });
    } else if (pct < 25 && target > 0) {
      insights.push({
        id: `goal-attention-${i}`,
        type: "info",
        category: "goals",
        impact: "medium",
        title: `${g.name} needs attention`,
        message: `You've saved ${pct}% of "${g.name}". Consider allocating a regular recurring deposit to accelerate momentum.`,
        icon: "Target",
        actionUrl: "/goals",
        actionText: "Deposit to Goal",
      });
    }
  }

  const recMonthly = recs.filter((r) => r.isActive && r.type === "expense").reduce((a, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    return a + (f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt);
  }, 0);

  const fixedShare = cmInc > 0 ? Math.round((recMonthly / cmInc) * 100) : 0;
  if (recMonthly > 0 && cmInc > 0) {
    if (fixedShare > 40) {
      insights.push({
        id: "recurring-high-fixed",
        type: "warning",
        category: "recurring",
        impact: "high",
        title: "High fixed commitment load",
        message: `Recurring expenses (~${formatMoney(recMonthly, currency)}/mo) consume ${fixedShare}% of your monthly income. Keeping this under 35% builds safer runway.`,
        icon: "Repeat",
        actionUrl: "/recurring",
        actionText: "Manage Subscriptions",
      });
    } else {
      insights.push({
        id: "recurring-overview",
        type: "info",
        category: "recurring",
        impact: "low",
        title: "Recurring commitments balanced",
        message: `You have ${recs.filter((r) => r.isActive).length} active recurring items totalling ~${formatMoney(recMonthly, currency)}/month (${fixedShare}% of income).`,
        icon: "Repeat",
        actionUrl: "/recurring",
        actionText: "View Recurring Hub",
      });
    }
  }

  const sortedCats = Object.entries(cmCats).sort((a, b) => b[1] - a[1]);
  const top = sortedCats[0];
  let topCategoryData: { name: string; amount: number; share: number } | null = null;

  if (top && cmExp > 0) {
    const share = Math.round((top[1] / cmExp) * 100);
    topCategoryData = { name: top[0], amount: Math.round(top[1]), share };
    insights.push({
      id: "top-spend-category",
      type: "info",
      category: "spending",
      impact: share >= 50 ? "high" : "medium",
      title: `Top spend: ${top[0]} (${share}%)`,
      message: `${top[0]} is your largest expense category this month at ${formatMoney(top[1], currency)} (${share}% of total spending).`,
      icon: "Crown",
      actionUrl: "/analytics",
      actionText: "Analyze Category",
    });
  }

  if (cmTxs.length === 0) {
    insights.push({
      id: "no-data-notice",
      type: "info",
      category: "spending",
      impact: "low",
      title: "No transactions recorded this month",
      message: "Log your daily transactions to unlock real-time financial health diagnostics and insights.",
      icon: "Sparkles",
      actionUrl: "/transactions",
      actionText: "Add Transaction",
    });
  }

  const dangerCount = insights.filter((i) => i.type === "danger").length;
  const warningCount = insights.filter((i) => i.type === "warning").length;
  const positiveCount = insights.filter((i) => i.type === "positive").length;

  let baseScore = 50;
  if (cmRate > 0) baseScore += Math.min(30, Math.round(cmRate * 0.6));
  else if (cmRate < 0) baseScore -= Math.min(25, Math.round(Math.abs(cmRate) * 0.4));

  baseScore += Math.min(15, positiveCount * 4);
  baseScore -= dangerCount * 12;
  baseScore -= warningCount * 5;

  const score = cmTxs.length === 0 ? 100 : Math.max(10, Math.min(100, Math.round(baseScore)));
  const gradeLetter = cmTxs.length === 0 ? "A" : score >= 85 ? "A+" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 45 ? "C" : "D";
  const grade = cmTxs.length === 0 ? "Ready to Track" : score >= 75 ? "Optimal Health" : score >= 50 ? "Stable Financial Health" : "Attention Required";

  return ok(res, {
    insights: insights.slice(0, 25),
    score,
    grade,
    gradeLetter,
    month: cmKey,
    metrics: {
      savingsRate: Math.round(cmRate),
      budgetUtilization,
      activeBudgetsCount: monthBudgets.length,
      exceededBudgetsCount,
      fixedCostRatio: fixedShare,
      monthlyIncome: Math.round(cmInc),
      monthlyExpense: Math.round(cmExp),
      netCashflow: Math.round(cmInc - cmExp),
      recurringMonthly: Math.round(recMonthly),
      topCategory: topCategoryData,
    },
  });
});

export default router;
