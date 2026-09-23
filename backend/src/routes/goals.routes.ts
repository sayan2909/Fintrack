import { Router } from "express";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount, pushNotification } from "@/lib/server-utils";

const router = Router();

// GET /api/goals
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
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
  return ok(res, { goals: enriched });
});

// POST /api/goals
router.post("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    const { name, targetAmount, currentAmount, targetDate, description, color } = req.body ?? {};
    if (!name?.trim()) return fail(res, "Goal name is required.", 400);
    const target = parseAmount(targetAmount);
    if (!target) return fail(res, "Target amount must be positive.", 400);
    let current = 0;
    if (currentAmount !== undefined && currentAmount !== "" && currentAmount !== null) {
      const c = parseFloat(currentAmount);
      if (Number.isNaN(c) || c < 0) return fail(res, "Current amount must be non-negative.", 400);
      current = c;
    }
    let tDate: string | null = null;
    if (targetDate) {
      const d = new Date(targetDate);
      if (Number.isNaN(d.getTime())) return fail(res, "Invalid target date.", 400);
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
    return ok(res, { goal: rows[0] }, 201);
  } catch (e) {
    console.error("create goal", e);
    return fail(res, "Unable to create goal.", 500);
  }
});

// PUT /api/goals/:id
router.put("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound(res, "Goal not found.");
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail(res, "Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.targetAmount !== undefined) {
      const t = parseAmount(body.targetAmount);
      if (!t) return fail(res, "Target must be positive.", 400);
      updates.targetAmount = String(t);
    }
    if (body.currentAmount !== undefined) {
      const c = parseFloat(body.currentAmount);
      if (Number.isNaN(c) || c < 0) return fail(res, "Current amount invalid.", 400);
      updates.currentAmount = String(c);
    }
    if (body.targetDate !== undefined) {
      if (!body.targetDate) updates.targetDate = null;
      else {
        const d = new Date(body.targetDate);
        if (Number.isNaN(d.getTime())) return fail(res, "Invalid date.", 400);
        updates.targetDate = d.toISOString().slice(0, 10);
      }
    }
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.color !== undefined) updates.color = body.color;
    updates.updatedAt = new Date();
    const updated = await db.update(savingsGoals).set(updates).where(eq(savingsGoals.id, id)).returning();
    return ok(res, { goal: updated[0] });
  } catch (e) {
    console.error("update goal", e);
    return fail(res, "Unable to update goal.", 500);
  }
});

// POST /api/goals/:id/contribute
router.post("/:id/contribute", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound(res, "Goal not found.");
  try {
    const { amount, action } = req.body ?? {};
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) return fail(res, "Amount must be positive.", 400);
    const goal = rows[0];
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    let next = action === "withdraw" ? current - amt : current + amt;
    if (next < 0) return fail(res, "Insufficient funds in goal.", 400);
    const updated = await db.update(savingsGoals).set({ currentAmount: String(Math.round(next * 100) / 100), updatedAt: new Date() }).where(eq(savingsGoals.id, id)).returning();
    const pct = target > 0 ? Math.round((next / target) * 100) : 0;
    if (user.notifyGoals) {
      if (pct >= 100) await pushNotification(user.id, "Goal achieved! 🎉", `You've reached your "${goal.name}" goal. Congratulations!`, "goal", { goalId: id });
      else if (pct >= 75) await pushNotification(user.id, "Savings milestone", `You've saved ${pct}% of your "${goal.name}" goal. Keep going!`, "goal", { goalId: id });
      else if (pct >= 50 && current < target * 0.5) await pushNotification(user.id, "Halfway there", `You've reached 50% of "${goal.name}".`, "goal", { goalId: id });
    }
    return ok(res, { goal: updated[0] });
  } catch (e) {
    console.error("contribute", e);
    return fail(res, "Unable to update goal balance.", 500);
  }
});

// DELETE /api/goals/:id
router.delete("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id))).limit(1);
  if (!rows[0]) return notFound(res, "Goal not found.");
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  return ok(res, { deleted: true });
});

export default router;
