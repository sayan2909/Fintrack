import { Router } from "express";
import { db } from "@/db";
import { transactions, categories, accounts } from "@/db/schema";
import { and, eq, gte, lte, desc, asc, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

const router = Router();

// GET /api/transactions
router.get("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const search = (req.query.search as string) || "";
    const type = (req.query.type as string) || "";
    const category = (req.query.category as string) || "";
    const accountId = (req.query.accountId as string) || "";
    const paymentMethod = (req.query.paymentMethod as string) || "";
    const dateParam = (req.query.date as string) || "";
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const sortBy = (req.query.sortBy as string) || "date";
    const sortDir = (req.query.sortDir as string) || "desc";
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));

    const conds = [eq(transactions.userId, user.id)];
    if (type === "income" || type === "expense") conds.push(eq(transactions.type, type));
    if (category) conds.push(eq(transactions.categoryName, category));
    if (accountId) conds.push(eq(transactions.accountId, accountId));
    if (paymentMethod) conds.push(eq(transactions.paymentMethod, paymentMethod));
    if (dateParam) conds.push(eq(transactions.date, dateParam));
    if (from) conds.push(gte(transactions.date, from));
    if (to) conds.push(lte(transactions.date, to));

    const orderCol =
      sortBy === "amount"
        ? transactions.amount
        : sortBy === "description"
        ? transactions.description
        : transactions.date;
    const order = sortDir === "asc" ? asc(orderCol) : desc(orderCol);

    const all = await db
      .select()
      .from(transactions)
      .where(and(...conds))
      .orderBy(order, desc(transactions.createdAt));

    let filtered = all;
    if (search) {
      const s = search.toLowerCase();
      const userAccs = await db.select().from(accounts).where(eq(accounts.userId, user.id));
      const accMap = new Map<string, string>(userAccs.map((a) => [a.id, (a.name || "").toLowerCase()]));

      filtered = all.filter((t) => {
        const accName = t.accountId ? accMap.get(t.accountId) || "" : "";
        return (
          (t.description || "").toLowerCase().includes(s) ||
          (t.categoryName || "").toLowerCase().includes(s) ||
          (t.notes || "").toLowerCase().includes(s) ||
          (t.paymentMethod || "").toLowerCase().includes(s) ||
          accName.includes(s)
        );
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

    const allUserTx = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(eq(transactions.userId, user.id));

    const incomeTotal = allUserTx
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + parseFloat(t.amount || "0"), 0);
    const expenseTotal = allUserTx
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + parseFloat(t.amount || "0"), 0);

    return ok(res, {
      transactions: paged,
      pagination: { page, limit, total, totalPages },
      summary: {
        income: Math.round(incomeTotal),
        expenses: Math.round(expenseTotal),
        net: Math.round(incomeTotal - expenseTotal),
      },
    });
  } catch (e) {
    console.error("GET transactions error:", e);
    return fail(res, "Unable to retrieve transactions.", 500);
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    const {
      type,
      amount,
      description,
      categoryId,
      category,
      categoryName,
      accountId,
      date,
      paymentMethod,
      notes,
    } = req.body ?? {};

    if (!["income", "expense"].includes(type)) return fail(res, "Type must be income or expense.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail(res, "Amount must be a positive number.", 400);
    if (!description?.trim()) return fail(res, "Description is required.", 400);
    if (!date) return fail(res, "Date is required.", 400);

    let parsedDateStr: string;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      parsedDateStr = date;
    } else {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return fail(res, "Invalid date.", 400);
      parsedDateStr = d.toISOString().slice(0, 10);
    }

    let catId: string | null = categoryId || null;
    let catName: string | null = category || categoryName || null;
    if (catId) {
      const c = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, catId), eq(categories.userId, user.id)))
        .limit(1);
      if (!c[0]) return fail(res, "Category not found.", 404);
      catName = c[0].name;
    } else if (catName) {
      const c = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, user.id), eq(categories.name, catName)))
        .limit(1);
      if (c[0]) {
        catId = c[0].id;
        catName = c[0].name;
      }
    }
    if (!catName) catName = type === "income" ? "Other Income" : "Other";

    let accId: string | null = null;
    if (accountId) {
      const a = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
        .limit(1);
      if (a[0]) {
        accId = a[0].id;
        const currentBal = parseFloat(a[0].balance || "0");
        const delta = type === "income" ? amt : -amt;
        await db
          .update(accounts)
          .set({
            balance: String(Math.round((currentBal + delta) * 100) / 100),
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, a[0].id));
      }
    }

    const rows = await db
      .insert(transactions)
      .values({
        userId: user.id,
        categoryId: catId,
        accountId: accId,
        categoryName: catName,
        type,
        amount: String(amt),
        description: description.trim(),
        date: parsedDateStr,
        paymentMethod: paymentMethod || "Cash",
        notes: notes || null,
      })
      .returning();

    return ok(res, { transaction: rows[0] }, 201);
  } catch (e) {
    console.error("create tx", e);
    return fail(res, "Unable to create transaction.", 500);
  }
});

// GET /api/transactions/:id
router.get("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound(res, "Transaction not found.");
  return ok(res, { transaction: rows[0] });
});

// PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound(res, "Transaction not found.");
  const existing = rows[0];

  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};

    let newType = existing.type;
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) return fail(res, "Invalid type.", 400);
      updates.type = body.type;
      newType = body.type;
    }

    let newAmt = parseFloat(existing.amount);
    if (body.amount !== undefined) {
      const amt = parseAmount(body.amount);
      if (!amt) return fail(res, "Amount must be positive.", 400);
      updates.amount = String(amt);
      newAmt = amt;
    }

    if (body.description !== undefined) {
      if (!String(body.description).trim()) return fail(res, "Description cannot be empty.", 400);
      updates.description = String(body.description).trim();
    }

    if (body.date !== undefined) {
      if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        updates.date = body.date;
      } else {
        const d = new Date(body.date);
        if (Number.isNaN(d.getTime())) return fail(res, "Invalid date.", 400);
        updates.date = d.toISOString().slice(0, 10);
      }
    }

    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    if (body.categoryId !== undefined) {
      if (body.categoryId) {
        const c = await db
          .select()
          .from(categories)
          .where(and(eq(categories.id, body.categoryId), eq(categories.userId, user.id)))
          .limit(1);
        if (!c[0]) return fail(res, "Category not found.", 404);
        updates.categoryId = c[0].id;
        updates.categoryName = c[0].name;
      } else {
        updates.categoryId = null;
      }
    }

    if (body.category !== undefined || body.categoryName !== undefined) {
      const nm = body.category ?? body.categoryName;
      if (nm) {
        const c = await db
          .select()
          .from(categories)
          .where(and(eq(categories.userId, user.id), eq(categories.name, String(nm))))
          .limit(1);
        if (c[0]) {
          updates.categoryId = c[0].id;
          updates.categoryName = c[0].name;
        } else {
          updates.categoryName = String(nm);
        }
      }
    }

    let targetAccId = existing.accountId;
    if (body.accountId !== undefined) {
      if (body.accountId) {
        const a = await db
          .select()
          .from(accounts)
          .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, user.id)))
          .limit(1);
        if (!a[0]) return fail(res, "Account not found.", 404);
        updates.accountId = a[0].id;
        targetAccId = a[0].id;
      } else {
        updates.accountId = null;
        targetAccId = null;
      }
    }

    if (
      existing.accountId !== targetAccId ||
      existing.type !== newType ||
      parseFloat(existing.amount) !== newAmt
    ) {
      if (existing.accountId) {
        const oldAcc = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, existing.accountId))
          .limit(1);
        if (oldAcc[0]) {
          const oldCurBal = parseFloat(oldAcc[0].balance || "0");
          const revDelta = existing.type === "income" ? -parseFloat(existing.amount) : parseFloat(existing.amount);
          await db
            .update(accounts)
            .set({
              balance: String(Math.round((oldCurBal + revDelta) * 100) / 100),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, oldAcc[0].id));
        }
      }
      if (targetAccId) {
        const newAcc = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, targetAccId))
          .limit(1);
        if (newAcc[0]) {
          const newCurBal = parseFloat(newAcc[0].balance || "0");
          const applyDelta = newType === "income" ? newAmt : -newAmt;
          await db
            .update(accounts)
            .set({
              balance: String(Math.round((newCurBal + applyDelta) * 100) / 100),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, newAcc[0].id));
        }
      }
    }

    updates.updatedAt = new Date();
    const updated = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    return ok(res, { transaction: updated[0] });
  } catch (e) {
    console.error("update tx", e);
    return fail(res, "Unable to update transaction.", 500);
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  const { id } = req.params;
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound(res, "Transaction not found.");
  const tx = rows[0];

  try {
    if (tx.accountId) {
      const acc = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).limit(1);
      if (acc[0]) {
        const curBal = parseFloat(acc[0].balance || "0");
        const revDelta = tx.type === "income" ? -parseFloat(tx.amount) : parseFloat(tx.amount);
        await db
          .update(accounts)
          .set({
            balance: String(Math.round((curBal + revDelta) * 100) / 100),
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, acc[0].id));
      }
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return ok(res, { deleted: true });
  } catch (e) {
    console.error("delete tx error:", e);
    return fail(res, "Unable to delete transaction.", 500);
  }
});

// POST /api/transactions/bulk-delete
router.post("/bulk-delete", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(res, "ids array is required and must not be empty.", 400);
    }

    const txs = await db
      .select()
      .from(transactions)
      .where(and(inArray(transactions.id, ids), eq(transactions.userId, user.id)));

    if (txs.length === 0) {
      return ok(res, { deletedCount: 0 });
    }

    // Roll back balances for accounts
    for (const tx of txs) {
      if (tx.accountId) {
        const acc = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).limit(1);
        if (acc[0]) {
          const curBal = parseFloat(acc[0].balance || "0");
          const revDelta = tx.type === "income" ? -parseFloat(tx.amount) : parseFloat(tx.amount);
          await db
            .update(accounts)
            .set({
              balance: String(Math.round((curBal + revDelta) * 100) / 100),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, acc[0].id));
        }
      }
    }

    const validIds = txs.map((t) => t.id);
    await db.delete(transactions).where(and(inArray(transactions.id, validIds), eq(transactions.userId, user.id)));

    return ok(res, { success: true, deletedCount: validIds.length });
  } catch (e) {
    console.error("bulk delete error:", e);
    return fail(res, "Unable to delete transactions.", 500);
  }
});

// POST /api/transactions/import
router.post("/import", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, "Invalid or empty import batch. Expected array of transactions.", 400);
  }

  if (items.length > 500) {
    return fail(res, "Batch size exceeds maximum limit of 500 transactions.", 400);
  }

  try {
    // Get user accounts to validate or associate default
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    const defaultAccount = userAccounts.find((a) => a.isDefault) || userAccounts[0];

    const inserted: Array<{ id: string; description: string; amount: string }> = [];
    const accountBalanceAdjustments: Record<string, number> = {};

    for (const item of items) {
      const amt = parseAmount(item.amount);
      if (!amt || amt <= 0) continue;

      const dateStr = item.date && !isNaN(Date.parse(item.date))
        ? new Date(item.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const type = item.type === "income" ? "income" : "expense";
      const desc = (item.description || "Imported Transaction").trim().slice(0, 200);
      const category = (item.categoryName || "General").trim().slice(0, 50);
      const paymentMethod = (item.paymentMethod || "Bank Transfer").trim().slice(0, 50);
      
      const targetAccountId = item.accountId && userAccounts.some((a) => a.id === item.accountId)
        ? item.accountId
        : defaultAccount?.id || null;

      const [newTx] = await db
        .insert(transactions)
        .values({
          userId: user.id,
          accountId: targetAccountId,
          amount: String(amt),
          type,
          categoryName: category,
          description: desc,
          date: dateStr,
          paymentMethod,
          notes: item.notes ? String(item.notes).slice(0, 500) : "Imported via CSV Bank Statement",
        })
        .returning();

      if (newTx) {
        inserted.push({ id: newTx.id, description: newTx.description, amount: newTx.amount });

        if (targetAccountId) {
          const delta = type === "income" ? amt : -amt;
          accountBalanceAdjustments[targetAccountId] = (accountBalanceAdjustments[targetAccountId] || 0) + delta;
        }
      }
    }

    // Apply accumulated balance adjustments to accounts
    for (const [accId, delta] of Object.entries(accountBalanceAdjustments)) {
      const acc = userAccounts.find((a) => a.id === accId);
      if (acc) {
        const curBal = parseFloat(acc.balance || "0");
        const nextBal = Math.round((curBal + delta) * 100) / 100;
        await db
          .update(accounts)
          .set({ balance: String(nextBal), updatedAt: new Date() })
          .where(eq(accounts.id, accId));
      }
    }

    return ok(res, {
      importedCount: inserted.length,
      totalReceived: items.length,
      inserted,
    });
  } catch (e) {
    console.error("CSV import error:", e);
    return fail(res, "Failed to import transactions. Please check your data format.", 500);
  }
});

export default router;
