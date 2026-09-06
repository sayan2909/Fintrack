import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound("Category not found.");
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail("Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    const updated = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return ok({ category: updated[0] });
  } catch (e) {
    console.error("update category", e);
    return fail("Unable to update category.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  if (!rows[0]) return notFound("Category not found.");
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "keep"; // keep | delete-tx | reassign
  const reassignTo = url.searchParams.get("reassignTo");
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (used.length > 0) {
    if (action === "delete-tx") {
      const { eq: eq2 } = await import("drizzle-orm");
      await db.delete(transactions).where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)));
    } else if (action === "reassign" && reassignTo) {
      await db
        .update(transactions)
        .set({ categoryId: reassignTo })
        .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)));
    } else {
      return fail(
        "This category is used by existing transactions. Reassign or delete those transactions first (use ?action=delete-tx or ?action=reassign&reassignTo=<id>).",
        409
      );
    }
  }
  await db.delete(categories).where(eq(categories.id, id));
  return ok({ deleted: true });
}
