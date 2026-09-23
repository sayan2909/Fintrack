import { Router } from "express";
import { db } from "@/db";
import { recurringTransactions, categories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount, nextDueDate } from "@/lib/server-utils";

const router = Router();

// GET /api/recurring
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const rows = await db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, user.id));
  const enriched = rows.map((r) => {
    const next = nextDueDate(r.startDate, r.frequency);
    const endOk = !r.endDate || new Date(r.endDate) >= new Date();
    return {
      ...r,
      nextDue: next.toISOString().slice(0, 10),
      upcoming: r.isActive && endOk,
      daysUntil: Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000)),
    };
  });
  enriched.sort((a, b) => a.daysUntil - b.daysUntil);
  const monthlyOut = enriched.filter((r) => r.type === "expense" && r.isActive).reduce((acc, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    const m = f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt;
    return acc + m;
  }, 0);
  const monthlyIn = enriched.filter((r) => r.type === "income" && r.isActive).reduce((acc, r) => {
    const amt = parseFloat(r.amount);
    const f = r.frequency.toLowerCase();
    const m = f === "daily" ? amt * 30 : f === "weekly" ? amt * 4.33 : f === "yearly" ? amt / 12 : amt;
    return acc + m;
  }, 0);
  return ok(res, { recurring: enriched, summary: { monthlyIn, monthlyOut, count: enriched.length } });
});

// POST /api/recurring
router.post("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    const body = req.body ?? {};
    const { name, amount, type, categoryId, categoryName, frequency, startDate, endDate, paymentMethod } = body;
    if (!name?.trim()) return fail(res, "Name is required.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail(res, "Amount must be positive.", 400);
    if (!["income", "expense"].includes(type)) return fail(res, "Type must be income or expense.", 400);
    if (!["Daily", "Weekly", "Monthly", "Yearly"].includes(frequency)) return fail(res, "Invalid frequency.", 400);
    if (!startDate) return fail(res, "Start date is required.", 400);
    const s = new Date(startDate);
    if (Number.isNaN(s.getTime())) return fail(res, "Invalid start date.", 400);
    let e: string | null = null;
    if (endDate) {
      const ed = new Date(endDate);
      if (Number.isNaN(ed.getTime())) return fail(res, "Invalid end date.", 400);
      if (ed < s) return fail(res, "End date cannot be before start date.", 400);
      e = ed.toISOString().slice(0, 10);
    }
    let catId: string | null = categoryId || null;
    let catName: string | null = categoryName || null;
    if (catId) {
      const c = await db.select().from(categories).where(and(eq(categories.id, catId), eq(categories.userId, user.id))).limit(1);
      if (c[0]) catName = c[0].name;
      else catId = null;
    }
    const rows = await db
      .insert(recurringTransactions)
      .values({
        userId: user.id,
        name: name.trim(),
        amount: String(amt),
        type,
        categoryId: catId,
        categoryName: catName,
        frequency,
        startDate: s.toISOString().slice(0, 10),
        endDate: e,
        paymentMethod: paymentMethod || "Bank Transfer",
        isActive: true,
      })
      .returning();
    return ok(res, { recurring: rows[0] }, 201);
  } catch (e2) {
    console.error("create recurring", e2);
    return fail(res, "Unable to create recurring transaction.", 500);
  }
});

// PUT /api/recurring/:id
router.put("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, user.id))).limit(1);
  if (!rows[0]) return notFound(res, "Recurring transaction not found.");
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail(res, "Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.amount !== undefined) {
      const a = parseAmount(body.amount);
      if (!a) return fail(res, "Amount must be positive.", 400);
      updates.amount = String(a);
    }
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) return fail(res, "Invalid type.", 400);
      updates.type = body.type;
    }
    if (body.frequency !== undefined) {
      if (!["Daily", "Weekly", "Monthly", "Yearly"].includes(body.frequency)) return fail(res, "Invalid frequency.", 400);
      updates.frequency = body.frequency;
    }
    if (body.startDate !== undefined) {
      const d = new Date(body.startDate);
      if (Number.isNaN(d.getTime())) return fail(res, "Invalid start date.", 400);
      updates.startDate = d.toISOString().slice(0, 10);
    }
    if (body.endDate !== undefined) {
      if (!body.endDate) updates.endDate = null;
      else {
        const d = new Date(body.endDate);
        if (Number.isNaN(d.getTime())) return fail(res, "Invalid end date.", 400);
        updates.endDate = d.toISOString().slice(0, 10);
      }
    }
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.categoryName !== undefined) updates.categoryName = body.categoryName || null;
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;
    const updated = await db.update(recurringTransactions).set(updates).where(eq(recurringTransactions.id, id)).returning();
    return ok(res, { recurring: updated[0] });
  } catch (e) {
    console.error("update recurring", e);
    return fail(res, "Unable to update.", 500);
  }
});

// DELETE /api/recurring/:id
router.delete("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, user.id))).limit(1);
  if (!rows[0]) return notFound(res, "Recurring transaction not found.");
  await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
  return ok(res, { deleted: true });
});

export default router;
