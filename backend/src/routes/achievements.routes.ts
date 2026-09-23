import { Router } from "express";
import { db } from "@/db";
import { transactions, savingsGoals, budgets, recurringTransactions, accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

const router = Router();

// GET /api/achievements
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const [
      txCountRes,
      goalsRes,
      budgetsRes,
      recurringRes,
      accountsRes,
      categoryCountRes,
      totalsRes,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(eq(transactions.userId, user.id)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.select().from(budgets).where(eq(budgets.userId, user.id)),
      db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
      db.select().from(accounts).where(eq(accounts.userId, user.id)),
      db.select({ count: sql<number>`count(DISTINCT ${transactions.categoryId})::int` }).from(transactions).where(eq(transactions.userId, user.id)),
      db.select({
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)::float`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)::float`,
      }).from(transactions).where(eq(transactions.userId, user.id)),
    ]);

    const txCount = txCountRes[0]?.count || 0;
    const goals = goalsRes || [];
    const completedGoals = goals.filter((g) => Number(g.currentAmount) >= Number(g.targetAmount)).length;
    const totalSavedInGoals = goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
    const budgetsCount = budgetsRes?.length || 0;
    const recurringCount = recurringRes?.length || 0;
    const accountsCount = accountsRes?.length || 0;
    const uniqueCategories = categoryCountRes[0]?.count || 0;
    const netSavings = (totalsRes[0]?.income || 0) - (totalsRes[0]?.expenses || 0);

    const ACHIEVEMENTS = [
      {
        id: "first_step",
        title: "First Step",
        description: "Log your first transaction in FinTrack",
        category: "Tracking",
        tier: "Bronze",
        icon: "Sparkles",
        progress: Math.min(txCount, 1),
        target: 1,
        unlocked: txCount >= 1,
        points: 50,
      },
      {
        id: "consistent_tracker",
        title: "Active Tracker",
        description: "Log 25 transactions across your accounts",
        category: "Tracking",
        tier: "Silver",
        icon: "CheckCircle2",
        progress: Math.min(txCount, 25),
        target: 25,
        unlocked: txCount >= 25,
        points: 150,
      },
      {
        id: "centurion",
        title: "Century Club",
        description: "Log 100 transactions to build a deep financial record",
        category: "Tracking",
        tier: "Gold",
        icon: "Award",
        progress: Math.min(txCount, 100),
        target: 100,
        unlocked: txCount >= 100,
        points: 300,
      },
      {
        id: "goal_crusher",
        title: "Goal Crusher",
        description: "Reach 100% completion on at least one savings goal",
        category: "Savings",
        tier: "Gold",
        icon: "Target",
        progress: Math.min(completedGoals, 1),
        target: 1,
        unlocked: completedGoals >= 1,
        points: 250,
      },
      {
        id: "emergency_cushion",
        title: "Emergency Cushion",
        description: "Accumulate at least ₹10,000 across your savings goals",
        category: "Savings",
        tier: "Silver",
        icon: "ShieldCheck",
        progress: Math.min(Math.round(totalSavedInGoals), 10000),
        target: 10000,
        unlocked: totalSavedInGoals >= 10000,
        points: 200,
      },
      {
        id: "budget_master",
        title: "Budget Master",
        description: "Create your first spending budget to curb overspending",
        category: "Budgeting",
        tier: "Bronze",
        icon: "Wallet",
        progress: Math.min(budgetsCount, 1),
        target: 1,
        unlocked: budgetsCount >= 1,
        points: 100,
      },
      {
        id: "auto_pilot",
        title: "Auto-Pilot",
        description: "Set up a recurring transaction to automate regular bills",
        category: "Automation",
        tier: "Bronze",
        icon: "Repeat",
        progress: Math.min(recurringCount, 1),
        target: 1,
        unlocked: recurringCount >= 1,
        points: 100,
      },
      {
        id: "diversified",
        title: "Diversified Finances",
        description: "Set up 2 or more accounts (e.g. Bank, Cash, Card, Wallet)",
        category: "Accounts",
        tier: "Silver",
        icon: "Building2",
        progress: Math.min(accountsCount, 2),
        target: 2,
        unlocked: accountsCount >= 2,
        points: 150,
      },
      {
        id: "organized",
        title: "Categorized Mind",
        description: "Record spending across at least 5 different categories",
        category: "Tracking",
        tier: "Silver",
        icon: "FolderTree",
        progress: Math.min(uniqueCategories, 5),
        target: 5,
        unlocked: uniqueCategories >= 5,
        points: 150,
      },
      {
        id: "wealth_builder",
        title: "Wealth Builder",
        description: "Achieve overall positive net savings in your portfolio",
        category: "Savings",
        tier: "Gold",
        icon: "TrendingUp",
        progress: netSavings > 0 ? 1 : 0,
        target: 1,
        unlocked: netSavings > 0,
        points: 250,
      },
    ];

    const totalPoints = ACHIEVEMENTS.reduce((sum, a) => sum + (a.unlocked ? a.points : 0), 0);
    const maxPoints = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
    const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

    return ok(res, {
      achievements: ACHIEVEMENTS,
      stats: {
        unlockedCount,
        totalCount: ACHIEVEMENTS.length,
        totalPoints,
        maxPoints,
        completionPct: Math.round((unlockedCount / ACHIEVEMENTS.length) * 100),
      },
    });
  } catch (err) {
    console.error("[Achievements GET] Error:", err);
    return fail(res, "Unable to calculate achievements.", 500);
  }
});

export default router;
