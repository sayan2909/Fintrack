import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, notFound } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const { id } = await params;
  if (id === "read-all") {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
    return ok({ updated: true });
  }
  const rows = await db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, user.id))).limit(1);
  if (!rows[0]) return notFound("Notification not found.");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  return ok({ updated: true });
}
