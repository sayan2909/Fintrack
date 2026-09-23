import { Router } from "express";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { ensureDefaultCategories } from "@/lib/server-utils";
import { CATEGORY_COLORS } from "@/lib/constants";

const router = Router();

// GET /api/categories
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  await ensureDefaultCategories(user.id);
  const rows = await db.select().from(categories).where(eq(categories.userId, user.id));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return ok(res, { categories: rows });
});

// POST /api/categories
router.post("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    const { name, type, color, icon } = req.body ?? {};
    if (!name?.trim()) return fail(res, "Category name is required.", 400);
    if (!["income", "expense"].includes(type)) return fail(res, "Type must be income or expense.", 400);
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, user.id), eq(categories.name, name.trim())));
    if (existing.length > 0) return fail(res, "A category with this name already exists.", 409);
    const rows = await db
      .insert(categories)
      .values({
        userId: user.id,
        name: name.trim(),
        type,
        color: color || CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
        icon: icon || "Tag",
      })
      .returning();
    return ok(res, { category: rows[0] }, 201);
  } catch (e) {
    console.error("create category", e);
    return fail(res, "Unable to create category.", 500);
  }
});

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound(res, "Category not found.");
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail(res, "Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    const updated = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return ok(res, { category: updated[0] });
  } catch (e) {
    console.error("update category", e);
    return fail(res, "Unable to update category.", 500);
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound(res, "Category not found.");
  const action = (req.query.action as string) || "keep";
  const reassignTo = req.query.reassignTo as string | undefined;
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (used.length > 0) {
    if (action === "delete-tx") {
      await db.delete(transactions).where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)));
    } else if (action === "reassign" && reassignTo) {
      await db
        .update(transactions)
        .set({ categoryId: reassignTo })
        .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)));
    } else {
      return fail(
        res,
        "This category is used by existing transactions. Reassign or delete those transactions first (use ?action=delete-tx or ?action=reassign&reassignTo=<id>).",
        409
      );
    }
  }
  await db.delete(categories).where(eq(categories.id, id));
  return ok(res, { deleted: true });
});

export default router;
