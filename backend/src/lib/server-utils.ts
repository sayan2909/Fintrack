import { db } from "@/db";
import { categories, accounts, notifications } from "@/db/schema";
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

export async function ensureDefaultAccount(userId: string) {
  const existing = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(accounts)
    .values({
      userId,
      name: "Main Account",
      type: "Bank Account",
      balance: "0",
      color: "#6366f1",
      icon: "Building2",
      isDefault: true,
    })
    .returning();
  return created;
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

export function parseDateOnly(str: string): Date {
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(str);
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nextDueDate(start: string, frequency: string, from = new Date()): Date {
  const s = parseDateOnly(start);
  if (Number.isNaN(s.getTime())) return from;
  const f = frequency.toLowerCase();

  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  let next = new Date(s);
  let guard = 0;
  while (next < fromMidnight && guard < 500) {
    if (f === "daily") next.setDate(next.getDate() + 1);
    else if (f === "weekly") next.setDate(next.getDate() + 7);
    else if (f === "monthly") next.setMonth(next.getMonth() + 1);
    else if (f === "yearly") next.setFullYear(next.getFullYear() + 1);
    else break;
    guard++;
  }
  return next;
}

export function advanceRecurringDueDate(startStr: string, frequency: string): string {
  const curDue = nextDueDate(startStr, frequency);
  const f = frequency.toLowerCase();
  const nextDate = new Date(curDue);

  if (f === "daily") nextDate.setDate(nextDate.getDate() + 1);
  else if (f === "weekly") nextDate.setDate(nextDate.getDate() + 7);
  else if (f === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
  else nextDate.setMonth(nextDate.getMonth() + 1);

  const fromMidnight = new Date();
  fromMidnight.setHours(0, 0, 0, 0);
  let guard = 0;
  while (nextDate < fromMidnight && guard < 500) {
    if (f === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (f === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (f === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
    else nextDate.setMonth(nextDate.getMonth() + 1);
    guard++;
  }

  return formatDateOnly(nextDate);
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
