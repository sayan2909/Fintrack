import { NextRequest } from "next/server";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const rows = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id));
  const enriched = rows.map((g) => {
    const target = parseFloat(g.targetAmount);
    const current = parseFloat(g.currentAmount);
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const remaining = Math.max(0, target - current);
    let daysRemaining: number | null = null;
    let monthlyNeeded: number | null = null;
    if (g.targetDate) {
      const diff = new Date(g.targetDate).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / 86400000));
      const monthsLeft = Math.max(1, Math.ceil(daysRemaining / 30));
      monthlyNeeded = remaining > 0 ? Math.round((remaining / monthsLeft) * 100) / 100 : 0;
    }
    return { ...g, percentComplete: pct, remaining, daysRemaining, monthlyNeeded };
  });
  return ok({ goals: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const { name, targetAmount, currentAmount, targetDate, description, color } = await req.json();
    if (!name?.trim()) return fail("Goal name is required.", 400);
    const target = parseAmount(targetAmount);
    if (!target) return fail("Target amount must be positive.", 400);
    let current = 0;
    if (currentAmount !== undefined && currentAmount !== "" && currentAmount !== null) {
      const c = parseFloat(currentAmount);
      if (Number.isNaN(c) || c < 0) return fail("Current amount must be non-negative.", 400);
      current = c;
    }
    let tDate: string | null = null;
    if (targetDate) {
      const d = new Date(targetDate);
      if (Number.isNaN(d.getTime())) return fail("Invalid target date.", 400);
      tDate = d.toISOString().slice(0, 10);
    }
    const rows = await db
      .insert(savingsGoals)
      .values({
        userId: user.id,
        name: name.trim(),
        targetAmount: String(target),
        currentAmount: String(current),
        targetDate: tDate,
        description: description || null,
        color: color || "#10b981",
      })
      .returning();
    return ok({ goal: rows[0] }, 201);
  } catch (e) {
    console.error("create goal", e);
    return fail("Unable to create goal.", 500);
  }
}
