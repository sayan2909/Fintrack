import { Router } from "express";
import { db } from "@/db";
import { categories, transactions, budgets } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { ensureDefaultCategories } from "@/lib/server-utils";
import { CATEGORY_COLORS } from "@/lib/constants";

const router = Router();

// GET /api/categories
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    await ensureDefaultCategories(user.id);
    const rows = await db.select().from(categories).where(eq(categories.userId, user.id));

    // Current month calculation
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [y, m] = currentMonth.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Transactions this month for user
    const txs = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        categoryName: transactions.categoryName,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      );

    // Budgets for this month
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, user.id), eq(budgets.month, currentMonth)));

    const spendByCatId: Record<string, number> = {};
    const incomeByCatId: Record<string, number> = {};
    const txCountByCatId: Record<string, number> = {};

    for (const t of txs) {
      const val = parseFloat(String(t.amount)) || 0;
      const tCatName = (t.categoryName || "").trim().toLowerCase();
      const catMatch = rows.find(
        (c) =>
          (t.categoryId && c.id === t.categoryId) ||
          (tCatName && (c.name || "").trim().toLowerCase() === tCatName)
      );
      const key = catMatch ? catMatch.id : (t.categoryId || "unknown");

      txCountByCatId[key] = (txCountByCatId[key] || 0) + 1;
      if (t.type === "expense") {
        spendByCatId[key] = (spendByCatId[key] || 0) + val;
      } else if (t.type === "income") {
        incomeByCatId[key] = (incomeByCatId[key] || 0) + val;
      }
    }

    let totalExpenseThisMonth = 0;
    let totalIncomeThisMonth = 0;

    const enriched = rows.map((c) => {
      const spentThisMonth = spendByCatId[c.id] || 0;
      const receivedThisMonth = incomeByCatId[c.id] || 0;
      const txCount = txCountByCatId[c.id] || 0;

      if (c.type === "expense") totalExpenseThisMonth += spentThisMonth;
      if (c.type === "income") totalIncomeThisMonth += receivedThisMonth;

      const cName = (c.name || "").trim().toLowerCase();
      const catBudget = userBudgets.find(
        (b) =>
          (b.categoryId && b.categoryId === c.id) ||
          ((b.categoryName || "").trim().toLowerCase() === cName)
      );

      let budgetInfo: {
        id: string;
        amount: number;
        spent: number;
        remaining: number;
        percentUsed: number;
        status: "healthy" | "warning" | "over";
      } | null = null;

      if (catBudget) {
        const budgetLimit = parseFloat(String(catBudget.amount)) || 0;
        const pct = budgetLimit > 0 ? Math.round((spentThisMonth / budgetLimit) * 100) : 0;
        budgetInfo = {
          id: catBudget.id,
          amount: budgetLimit,
          spent: spentThisMonth,
          remaining: Math.max(0, budgetLimit - spentThisMonth),
          percentUsed: pct,
          status: pct >= 100 ? "over" : pct >= 80 ? "warning" : "healthy",
        };
      }

      return {
        ...c,
        spentThisMonth,
        receivedThisMonth,
        txCount,
        budget: budgetInfo,
      };
    });

    enriched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const expenseCats = enriched.filter((c) => c.type === "expense" && c.spentThisMonth > 0);
    expenseCats.sort((a, b) => b.spentThisMonth - a.spentThisMonth);
    const topExpenseCategory = expenseCats[0]
      ? { name: expenseCats[0].name, amount: expenseCats[0].spentThisMonth }
      : null;

    return ok(res, {
      categories: enriched,
      summary: {
        totalCategories: rows.length,
        expenseCount: rows.filter((r) => r.type === "expense").length,
        incomeCount: rows.filter((r) => r.type === "income").length,
        totalExpenseThisMonth,
        totalIncomeThisMonth,
        topExpenseCategory,
        activeBudgetsCount: userBudgets.length,
      },
    });
  } catch (err) {
    console.error("GET /api/categories error:", err);
    const fallbackRows = await db.select().from(categories).where(eq(categories.userId, user.id)).catch(() => []);
    fallbackRows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return ok(res, {
      categories: fallbackRows.map((r) => ({ ...r, spentThisMonth: 0, receivedThisMonth: 0, txCount: 0, budget: null })),
      summary: {
        totalCategories: fallbackRows.length,
        expenseCount: fallbackRows.filter((r) => r.type === "expense").length,
        incomeCount: fallbackRows.filter((r) => r.type === "income").length,
        totalExpenseThisMonth: 0,
        totalIncomeThisMonth: 0,
        topExpenseCategory: null,
        activeBudgetsCount: 0,
      },
    });
  }
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
      // Safely unlink category from transactions so transactions are preserved
      await db
        .update(transactions)
        .set({ categoryId: null })
        .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)));
    }
  }
  await db.delete(categories).where(eq(categories.id, id));
  return ok(res, { deleted: true });
});

export default router;
