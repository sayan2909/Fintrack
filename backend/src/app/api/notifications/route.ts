import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications, budgets, transactions, recurringTransactions, savingsGoals } from "@/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { nextDueDate } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Auto-generate smart notifications on the fly (budget + recurring + goals)
  try {
    const month = new Date().toISOString().slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

    const [userBudgets, txs, recs, goals] = await Promise.all([
      db.select().from(budgets).where(and(eq(budgets.userId, user.id), eq(budgets.month, month))),
      db.select().from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), gte(transactions.date, start), lte(transactions.date, end))),
      db.select().from(recurringTransactions).where(and(eq(recurringTransactions.userId, user.id), eq(recurringTransactions.isActive, true))),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
    ]);

    const spentByCat: Record<string, number> = {};
    for (const t of txs) {
      const k = (t.categoryName || "Other").toLowerCase();
      spentByCat[k] = (spentByCat[k] || 0) + parseFloat(t.amount);
    }
    const auto: { title: string; message: string; kind: string }[] = [];
    for (const b of userBudgets) {
      const spent = spentByCat[(b.categoryName || "").toLowerCase()] || 0;
      const total = parseFloat(b.amount);
      const pct = total ? (spent / total) * 100 : 0;
      if (pct >= 100 && user.notifyBudget) auto.push({ title: "Budget exceeded", message: `You've exceeded your ${b.categoryName} budget for ${month} (${Math.round(pct)}% used).`, kind: "budget" });
      else if (pct >= 80 && user.notifyBudget) auto.push({ title: "Budget nearing limit", message: `You've used ${Math.round(pct)}% of your ${b.categoryName} budget.`, kind: "budget" });
    }
    if (user.notifyRecurring) {
      for (const r of recs.slice(0, 20)) {
        const next = nextDueDate(r.startDate, r.frequency);
        const days = Math.ceil((next.getTime() - Date.now()) / 86400000);
        if (days >= 0 && days <= 7) {
          const urgency = days === 0 ? "⚠️ Payment Due Today" : days === 1 ? "⚠️ Payment Due Tomorrow" : "Upcoming Payment Alert";
          const dueText = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
          auto.push({
            title: urgency,
            message: `${r.name} (${r.categoryName || "Bill"}) of ₹${Number(r.amount).toLocaleString("en-IN")} is due ${dueText} (${next.toISOString().slice(0, 10)}).`,
            kind: "recurring",
          });
        }
      }
    }
    if (user.notifyGoals) {
      for (const g of goals) {
        const target = parseFloat(g.targetAmount);
        const cur = parseFloat(g.currentAmount);
        const pct = target ? (cur / target) * 100 : 0;
        if (pct >= 100) auto.push({ title: "Goal achieved", message: `Goal "${g.name}" is complete!`, kind: "goal" });
        else if (pct >= 75) auto.push({ title: "Savings milestone", message: `You're ${Math.round(pct)}% toward "${g.name}".`, kind: "goal" });
      }
    }

    // Insert auto notifications if not duplicates (check recent same title+message)
    const existing = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
    const existingKeys = new Set(existing.map((n) => `${n.title}|${n.message}`));
    for (const a of auto.slice(0, 10)) {
      if (!existingKeys.has(`${a.title}|${a.message}`)) {
        await db.insert(notifications).values({ userId: user.id, title: a.title, message: a.message, kind: a.kind });
      }
    }
  } catch (e) {
    console.error("auto notify", e);
  }

  const all = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
  const unread = all.filter((n) => !n.isRead).length;
  return ok({ notifications: all, unread });
}
