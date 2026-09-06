import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, budgets, savingsGoals, recurringTransactions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

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

  const insights: { type: "positive" | "warning" | "danger" | "info"; title: string; message: string; icon: string }[] = [];

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
  for (const cat of allCats) {
    const cur = cmCats[cat] || 0;
    const prev = pmCats[cat] || 0;
    if (prev > 0 && cur > 0) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      if (pct >= 15) insights.push({ type: "warning", title: `${cat} spending up ${pct}%`, message: `Your ${cat.toLowerCase()} spending increased by ${pct}% compared with last month (₹${Math.round(prev).toLocaleString("en-IN")} → ₹${Math.round(cur).toLocaleString("en-IN")}).`, icon: "TrendingUp" });
      else if (pct <= -15) insights.push({ type: "positive", title: `${cat} spending down ${Math.abs(pct)}%`, message: `Great job! Your ${cat.toLowerCase()} spending decreased by ${Math.abs(pct)}% compared with last month.`, icon: "TrendingDown" });
    } else if (cur > 0 && prev === 0) {
      insights.push({ type: "info", title: `New spending in ${cat}`, message: `You spent ₹${Math.round(cur).toLocaleString("en-IN")} on ${cat.toLowerCase()} this month, with no spending there last month.`, icon: "Sparkles" });
    }
  }

  // Budgets
  for (const b of monthBudgets) {
    const spent = cmCats[b.categoryName] || 0;
    const total = parseFloat(b.amount);
    const pct = total ? Math.round((spent / total) * 100) : 0;
    if (pct >= 100) insights.push({ type: "danger", title: `${b.categoryName} budget exceeded`, message: `You have used ${pct}% of your ${b.categoryName.toLowerCase()} budget (₹${Math.round(spent).toLocaleString("en-IN")} / ₹${Math.round(total).toLocaleString("en-IN")}).`, icon: "AlertTriangle" });
    else if (pct >= 80) insights.push({ type: "warning", title: `${b.categoryName} budget at ${pct}%`, message: `You have used ${pct}% of your entertainment budget. ₹${Math.round(total - spent).toLocaleString("en-IN")} remaining.`.replace("entertainment", b.categoryName.toLowerCase()), icon: "Gauge" });
  }

  // Savings rate
  const sum = (arr: typeof cmTxs, ty: string) => arr.filter((t) => t.type === ty).reduce((a, t) => a + parseFloat(t.amount), 0);
  const cmInc = sum(cmTxs, "income");
  const cmExp = sum(cmTxs, "expense");
  const pmInc = sum(pmTxs, "income");
  const pmExp = sum(pmTxs, "expense");
  const cmRate = cmInc > 0 ? ((cmInc - cmExp) / cmInc) * 100 : 0;
  const pmRate = pmInc > 0 ? ((pmInc - pmExp) / pmInc) * 100 : 0;
  if (cmInc > 0 || pmInc > 0) {
    const diff = Math.round((cmRate - pmRate) * 10) / 10;
    if (diff > 2) insights.push({ type: "positive", title: "Savings rate improved", message: `Your savings rate improved to ${Math.round(cmRate)}% compared with ${Math.round(pmRate)}% last month. Keep it up!`, icon: "PiggyBank" });
    else if (diff < -2) insights.push({ type: "warning", title: "Savings rate declined", message: `Your savings rate dropped to ${Math.round(cmRate)}% from ${Math.round(pmRate)}% last month. Review recent expenses.`, icon: "PiggyBank" });
    else insights.push({ type: "info", title: `Savings rate steady at ${Math.round(cmRate)}%`, message: `You saved ${Math.round(cmRate)}% of your income this month.`, icon: "PiggyBank" });
  }

  // Goals
  for (const g of goals) {
    const target = parseFloat(g.targetAmount);
    const cur = parseFloat(g.currentAmount);
    const pct = target ? Math.round((cur / target) * 100) : 0;
    if (pct >= 100) insights.push({ type: "positive", title: `Goal "${g.name}" complete`, message: `You are done! "${g.name}" reached 100%. Time to celebrate or set a new goal.`, icon: "Trophy" });
    else if (pct >= 50) insights.push({ type: "positive", title: `On track: ${g.name}`, message: `You are currently ${pct}% toward your ${g.name.toLowerCase()} savings goal (₹${Math.round(cur).toLocaleString("en-IN")} of ₹${Math.round(target).toLocaleString("en-IN")}).`, icon: "Target" });
    else if (pct < 25 && target > 0) insights.push({ type: "info", title: `${g.name} needs attention`, message: `You've saved ${pct}% of "${g.name}". Consider a small recurring contribution to stay on track.`, icon: "Target" });
  }

  // Recurring load
  const recMonthly = recs.filter((r) => r.isActive && r.type === "expense").reduce((a, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    return a + (f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt);
  }, 0);
  if (recMonthly > 0 && cmInc > 0) {
    const share = Math.round((recMonthly / cmInc) * 100);
    if (share > 40) insights.push({ type: "warning", title: "High fixed costs", message: `Recurring expenses (~₹${Math.round(recMonthly).toLocaleString("en-IN")}/mo) consume about ${share}% of this month's income.`, icon: "Repeat" });
    else insights.push({ type: "info", title: "Recurring overview", message: `You have ${recs.filter((r) => r.isActive).length} active recurring items totalling ~₹${Math.round(recMonthly).toLocaleString("en-IN")} per month.`, icon: "Repeat" });
  }

  // Top category
  const top = Object.entries(cmCats).sort((a, b) => b[1] - a[1])[0];
  if (top && cmExp > 0) {
    const share = Math.round((top[1] / cmExp) * 100);
    insights.push({ type: "info", title: `Top spend: ${top[0]} (${share}%)`, message: `${top[0]} is your highest expense category this month at ₹${Math.round(top[1]).toLocaleString("en-IN")}.`, icon: "Crown" });
  }

  if (cmTxs.length === 0) {
    insights.push({ type: "info", title: "No data this month", message: "Add transactions to unlock personalized insights about your spending.", icon: "Sparkles" });
  }

  // score
  const score = Math.max(0, Math.min(100, Math.round(cmRate < 0 ? 20 : 50 + cmRate / 2 - insights.filter((i) => i.type === "danger").length * 10)));
  return ok({ insights: insights.slice(0, 20), score, month: cmKey });
}
