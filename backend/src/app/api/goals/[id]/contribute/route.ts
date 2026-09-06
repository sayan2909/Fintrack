import { NextRequest } from "next/server";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { pushNotification } from "@/lib/server-utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Goal not found.");
  try {
    const { amount, action } = await req.json();
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) return fail("Amount must be positive.", 400);
    const goal = rows[0];
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    let next = action === "withdraw" ? current - amt : current + amt;
    if (next < 0) return fail("Insufficient funds in goal.", 400);
    const updated = await db.update(savingsGoals).set({ currentAmount: String(Math.round(next * 100) / 100), updatedAt: new Date() }).where(eq(savingsGoals.id, id)).returning();
    const pct = target > 0 ? Math.round((next / target) * 100) : 0;
    if (user.notifyGoals) {
      if (pct >= 100) await pushNotification(user.id, "Goal achieved! 🎉", `You've reached your "${goal.name}" goal. Congratulations!`, "goal", { goalId: id });
      else if (pct >= 75) await pushNotification(user.id, "Savings milestone", `You've saved ${pct}% of your "${goal.name}" goal. Keep going!`, "goal", { goalId: id });
      else if (pct >= 50 && current < target * 0.5) await pushNotification(user.id, "Halfway there", `You've reached 50% of "${goal.name}".`, "goal", { goalId: id });
    }
    return ok({ goal: updated[0] });
  } catch (e) {
    console.error("contribute", e);
    return fail("Unable to update goal balance.", 500);
  }
}
