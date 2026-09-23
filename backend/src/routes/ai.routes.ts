import { Router } from "express";
import { db } from "@/db";
import { transactions, budgets, accounts, recurringTransactions, savingsGoals } from "@/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { nextDueDate } from "@/lib/server-utils";

const router = Router();

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return fail(res, "Message is required.", 400);
  }

  const query = message.trim().toLowerCase();
  const currency = user.currency || "INR";

  try {
    // 1. Fetch user accounts & net worth
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id));
    const totalBalance = userAccounts.reduce((acc, a) => acc + parseFloat(a.balance || "0"), 0);

    // 2. Fetch current month's transactions
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    const monthTxs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), gte(transactions.date, firstDayOfMonth), lte(transactions.date, todayStr)))
      .orderBy(desc(transactions.date));

    const totalIncome = monthTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    const totalExpense = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    // Calculate category breakdown
    const catMap: Record<string, number> = {};
    for (const t of monthTxs.filter((tx) => tx.type === "expense")) {
      const c = t.categoryName || "Uncategorized";
      catMap[c] = (catMap[c] || 0) + parseFloat(t.amount || "0");
    }
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0] ? { name: sortedCats[0][0], amount: sortedCats[0][1] } : null;

    // 3. Fetch budgets & compute usage
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, user.id));

    const budgetStatus = userBudgets.map((b) => {
      const spent = catMap[b.categoryName] || 0;
      const limit = parseFloat(b.amount || "0");
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return {
        name: b.categoryName,
        limit,
        spent,
        pct,
        overBudget: spent > limit,
        nearLimit: spent >= limit * 0.8 && spent <= limit,
      };
    });

    const overBudgets = budgetStatus.filter((b) => b.overBudget);
    const nearBudgets = budgetStatus.filter((b) => b.nearLimit);

    // 4. Fetch recurring subscriptions due soon
    const recurringList = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, user.id), eq(recurringTransactions.isActive, true)));

    const upcomingBills = recurringList
      .map((r) => {
        const next = nextDueDate(r.startDate, r.frequency);
        const days = Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000));
        return {
          id: r.id,
          name: r.name,
          amount: parseFloat(r.amount),
          frequency: r.frequency,
          daysUntil: days,
          dueDate: next.toISOString().slice(0, 10),
        };
      })
      .filter((r) => r.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // 5. Fetch savings goals
    const goals = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, user.id));

    // 6. Intelligent reasoning engine
    let reply = "";
    const actions: Array<{ label: string; href: string }> = [];

    const fmt = (n: number) =>
      new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100);

    if (query.includes("net worth") || query.includes("balance") || query.includes("how much money") || query.includes("assets")) {
      reply = `Your current total liquid net worth across **${userAccounts.length} accounts** is **${currency} ${fmt(totalBalance)}**.\n\n`;
      if (userAccounts.length > 0) {
        reply += `Here is your account breakdown:\n`;
        userAccounts.forEach((a) => {
          reply += `• **${a.name}**: ${currency} ${fmt(parseFloat(a.balance || "0"))} (${a.type})\n`;
        });
      }
      actions.push({ label: "View Accounts", href: "/accounts" });
      actions.push({ label: "Log Transaction", href: "/transactions" });
    } else if (
      query.includes("spend") ||
      query.includes("expense") ||
      query.includes("spent") ||
      query.includes("burn rate") ||
      query.includes("cost")
    ) {
      reply = `So far this month, you have spent **${currency} ${fmt(totalExpense)}** across ${monthTxs.filter((t) => t.type === "expense").length} expense transactions.\n\n`;
      if (topCat) {
        const pct = totalExpense > 0 ? Math.round((topCat.amount / totalExpense) * 100) : 0;
        reply += `Your top spending category is **${topCat.name}**, accounting for **${currency} ${fmt(topCat.amount)}** (${pct}% of all monthly outflows).\n\n`;
      }
      if (sortedCats.length > 1) {
        reply += `Other key categories:\n`;
        sortedCats.slice(1, 4).forEach(([cName, cAmt]) => {
          reply += `• **${cName}**: ${currency} ${fmt(cAmt)}\n`;
        });
      }
      actions.push({ label: "Analyze Spending", href: "/analytics" });
      actions.push({ label: "View All Transactions", href: "/transactions" });
    } else if (
      query.includes("bill") ||
      query.includes("subscription") ||
      query.includes("recurring") ||
      query.includes("due") ||
      query.includes("upcoming")
    ) {
      if (upcomingBills.length > 0) {
        const totalDue = upcomingBills.reduce((s, b) => s + b.amount, 0);
        reply = `You have **${upcomingBills.length} recurring payments** due within the next 14 days, totaling **${currency} ${fmt(totalDue)}**:\n\n`;
        upcomingBills.forEach((b) => {
          const timing = b.daysUntil === 0 ? "Due Today" : b.daysUntil === 1 ? "Due Tomorrow" : `Due in ${b.daysUntil} days`;
          reply += `• **${b.name}**: ${currency} ${fmt(b.amount)} — _${timing}_ (${b.frequency})\n`;
        });
        reply += `\nYou can 1-click **Mark as Paid** to log the expense and advance the cycle.`;
      } else {
        reply = `You're all clear! You don't have any recurring bills or subscriptions due in the next 14 days.`;
      }
      actions.push({ label: "Manage Subscriptions", href: "/recurring" });
    } else if (query.includes("budget") || query.includes("limit") || query.includes("overspend")) {
      if (userBudgets.length === 0) {
        reply = `You haven't set up any spending budgets yet. Setting category budgets helps avoid overspending!`;
        actions.push({ label: "Create Budget", href: "/budgets" });
      } else {
        reply = `You have **${userBudgets.length} active budgets** set up.\n\n`;
        if (overBudgets.length > 0) {
          reply += `⚠️ **Over Budget Alerts:**\n`;
          overBudgets.forEach((b) => {
            reply += `• **${b.name}**: Spent ${currency} ${fmt(b.spent)} of ${currency} ${fmt(b.limit)} (${b.pct}% used!)\n`;
          });
          reply += `\n`;
        }
        if (nearBudgets.length > 0) {
          reply += `⚡ **Approaching Limit (>80%):**\n`;
          nearBudgets.forEach((b) => {
            reply += `• **${b.name}**: Spent ${currency} ${fmt(b.spent)} of ${currency} ${fmt(b.limit)} (${b.pct}% used)\n`;
          });
          reply += `\n`;
        }
        if (overBudgets.length === 0 && nearBudgets.length === 0) {
          reply += `✅ Great discipline! All your active budgets are currently well within their limits.`;
        }
        actions.push({ label: "Manage Budgets", href: "/budgets" });
      }
    } else if (
      query.includes("save") ||
      query.includes("saving") ||
      query.includes("advice") ||
      query.includes("recommend") ||
      query.includes("plan")
    ) {
      const netCashflow = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

      reply = `### Financial Health Analysis 📈\n\n`;
      reply += `• **Monthly Inflow**: ${currency} ${fmt(totalIncome)}\n`;
      reply += `• **Monthly Outflow**: ${currency} ${fmt(totalExpense)}\n`;
      reply += `• **Net Cashflow**: ${netCashflow >= 0 ? "+" : "−"}${currency} ${fmt(Math.abs(netCashflow))}\n`;
      reply += `• **Savings Rate**: **${savingsRate}%**\n\n`;

      if (savingsRate < 20) {
        reply += `💡 **Recommendation**: Financial planners suggest aiming for at least a 20% savings rate. `;
        if (topCat) {
          reply += `Your highest expenditure is on **${topCat.name}** (${currency} ${fmt(topCat.amount)}). Setting a monthly ceiling here could save you an estimated ${currency} ${fmt(topCat.amount * 0.15)} monthly.`;
        }
      } else {
        reply += `🎉 **Excellent Performance!** Your savings rate of ${savingsRate}% exceeds standard benchmark targets. `;
        if (goals.length > 0) {
          reply += `You can allocate surplus cash towards your active goals like **${goals[0].name}**.`;
        }
      }
      actions.push({ label: "View Goals", href: "/goals" });
      actions.push({ label: "Monthly Reports", href: "/reports" });
    } else {
      reply = `Hello ${user.name.split(" ")[0]}! I'm **FinBot**, your autonomous financial intelligence copilot.\n\n`;
      reply += `I track your accounts, expenses, budgets, and bills in real-time. Here's a quick snapshot:\n\n`;
      reply += `• **Liquid Net Worth**: ${currency} ${fmt(totalBalance)}\n`;
      reply += `• **Spent This Month**: ${currency} ${fmt(totalExpense)}\n`;
      reply += `• **Income This Month**: ${currency} ${fmt(totalIncome)}\n`;
      if (upcomingBills.length > 0) {
        reply += `• **Upcoming Bills**: ${upcomingBills.length} payment(s) due soon\n`;
      }
      reply += `\nHow can I help you today? You can ask about your burn rate, upcoming bills, budget status, or savings recommendations!`;

      actions.push({ label: "Dashboard", href: "/dashboard" });
      actions.push({ label: "Insights", href: "/insights" });
    }

    return ok(res, {
      reply,
      actions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return fail(res, "Unable to process financial analysis.", 500);
  }
});

export default router;
