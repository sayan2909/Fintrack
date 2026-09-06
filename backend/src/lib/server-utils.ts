import { db } from "@/db";
import { categories, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./constants";

export async function ensureDefaultCategories(userId: string) {
  const existing = await db.select().from(categories).where(eq(categories.userId, userId)).limit(1);
  if (existing.length > 0) return;
  const rows = [
    ...INCOME_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      type: "income",
      color: c.color,
      icon: c.icon,
      isDefault: true,
    })),
    ...EXPENSE_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      type: "expense",
      color: c.color,
      icon: c.icon,
      isDefault: true,
    })),
  ];
  await db.insert(categories).values(rows);
}

export async function pushNotification(
  userId: string,
  title: string,
  message: string,
  kind = "info",
  meta?: Record<string, unknown>
) {
  try {
    await db.insert(notifications).values({ userId, title, message, kind, meta: meta as never });
  } catch {
    // ignore
  }
}

export function nextDueDate(start: string, frequency: string, from = new Date()): Date {
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return from;
  const f = frequency.toLowerCase();
  let next = new Date(s);
  let guard = 0;
  while (next < from && guard < 500) {
    if (f === "daily") next.setDate(next.getDate() + 1);
    else if (f === "weekly") next.setDate(next.getDate() + 7);
    else if (f === "monthly") next.setMonth(next.getMonth() + 1);
    else if (f === "yearly") next.setFullYear(next.getFullYear() + 1);
    else break;
    guard++;
  }
  return next;
}

export function monthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  return { start, end };
}

export function parseAmount(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (typeof n !== "number" || Number.isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}
