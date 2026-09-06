import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";
import { ensureDefaultCategories } from "@/lib/server-utils";
import { CATEGORY_COLORS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  await ensureDefaultCategories(user.id);
  const rows = await db.select().from(categories).where(eq(categories.userId, user.id));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return ok({ categories: rows });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  try {
    const { name, type, color, icon } = await req.json();
    if (!name?.trim()) return fail("Category name is required.", 400);
    if (!["income", "expense"].includes(type)) return fail("Type must be income or expense.", 400);
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, user.id), eq(categories.name, name.trim())));
    if (existing.length > 0) return fail("A category with this name already exists.", 409);
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
    return ok({ category: rows[0] }, 201);
  } catch (e) {
    console.error("create category", e);
    return fail("Unable to create category.", 500);
  }
}
