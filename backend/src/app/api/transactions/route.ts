import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories, accounts } from "@/db/schema";
import { and, eq, gte, lte, desc, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const type = url.searchParams.get("type") || "";
    const category = url.searchParams.get("category") || "";
    const accountId = url.searchParams.get("accountId") || "";
    const paymentMethod = url.searchParams.get("paymentMethod") || "";
    const dateParam = url.searchParams.get("date") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const sortBy = url.searchParams.get("sortBy") || "date";
    const sortDir = url.searchParams.get("sortDir") || "desc";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));

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
      filtered = all.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(s) ||
          (t.categoryName || "").toLowerCase().includes(s) ||
          (t.notes || "").toLowerCase().includes(s) ||
          (t.paymentMethod || "").toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

    // Compute overall summary totals across user's transactions
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

    return ok({
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
    return fail("Unable to retrieve transactions.", 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
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
    } = body ?? {};

    if (!["income", "expense"].includes(type)) return fail("Type must be income or expense.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail("Amount must be a positive number.", 400);
    if (!description?.trim()) return fail("Description is required.", 400);
    if (!date) return fail("Date is required.", 400);

    let parsedDateStr: string;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      parsedDateStr = date;
    } else {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return fail("Invalid date.", 400);
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
      if (!c[0]) return fail("Category not found.", 404);
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
        // Keep account balance updated
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

    return ok({ transaction: rows[0] }, 201);
  } catch (e) {
    console.error("create tx", e);
    return fail("Unable to create transaction.", 500);
  }
}
