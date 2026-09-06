import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { and, eq, gte, lte, ilike, or, sql, desc, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { parseAmount } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const type = url.searchParams.get("type") || "";
  const category = url.searchParams.get("category") || "";
  const paymentMethod = url.searchParams.get("paymentMethod") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const sortBy = url.searchParams.get("sortBy") || "date";
  const sortDir = url.searchParams.get("sortDir") || "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));

  const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, user.id)];
  // drizzle dynamic conditions: build with sql
  const filters: string[] = [];
  const params: unknown[] = [];
  // Use drizzle-orm conditions array properly
  const where: unknown[] = [];
  void filters; void params; void where;

  let query = db.select().from(transactions).where(eq(transactions.userId, user.id));

  // Fetch all then filter in memory for simplicity + correct pagination with joins?
  // For production scale use SQL; here dataset is small (personal finance) so we fetch filtered via SQL conditions.
  const conds = [eq(transactions.userId, user.id)];
  if (type === "income" || type === "expense") conds.push(eq(transactions.type, type));
  if (category) conds.push(eq(transactions.categoryName, category));
  if (paymentMethod) conds.push(eq(transactions.paymentMethod, paymentMethod));
  if (from) conds.push(gte(transactions.date, from));
  if (to) conds.push(lte(transactions.date, to));

  const orderCol = sortBy === "amount" ? transactions.amount : sortBy === "description" ? transactions.description : transactions.date;
  const order = sortDir === "asc" ? asc(orderCol) : desc(orderCol);

  const all = await db
    .select()
    .from(transactions)
    .where(and(...conds))
    .orderBy(order);

  let filtered = all;
  if (search) {
    const s = search.toLowerCase();
    filtered = all.filter(
      (t) =>
        t.description.toLowerCase().includes(s) ||
        (t.categoryName || "").toLowerCase().includes(s) ||
        (t.notes || "").toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

  const incomeTotal = filtered.filter((t) => t.type === "income").reduce((a, t) => a + parseFloat(t.amount), 0);
  const expenseTotal = filtered.filter((t) => t.type === "expense").reduce((a, t) => a + parseFloat(t.amount), 0);

  return ok({
    transactions: paged,
    pagination: { page, limit, total, totalPages },
    summary: { income: incomeTotal, expenses: expenseTotal, net: incomeTotal - expenseTotal },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
    const { type, amount, description, categoryId, category, categoryName, date, paymentMethod, notes } = body ?? {};
    if (!["income", "expense"].includes(type)) return fail("Type must be income or expense.", 400);
    const amt = parseAmount(amount);
    if (!amt) return fail("Amount must be a positive number.", 400);
    if (!description?.trim()) return fail("Description is required.", 400);
    if (!date) return fail("Date is required.", 400);
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return fail("Invalid date.", 400);

    let catId: string | null = categoryId || null;
    let catName: string | null = category || categoryName || null;
    let catColor: string | undefined;
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

    const rows = await db
      .insert(transactions)
      .values({
        userId: user.id,
        categoryId: catId,
        categoryName: catName,
        type,
        amount: String(amt),
        description: description.trim(),
        date: d.toISOString().slice(0, 10),
        paymentMethod: paymentMethod || "Cash",
        notes: notes || null,
      })
      .returning();
    void catColor;
    return ok({ transaction: rows[0] }, 201);
  } catch (e) {
    console.error("create tx", e);
    return fail("Unable to create transaction.", 500);
  }
}
