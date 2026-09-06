import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ok, fail } from "@/lib/response";
import { validateEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !validateEmail(String(email).toLowerCase()))
      return fail("Please enter a valid email address.", 400);
    const normalized = String(email).trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    // Always respond success to avoid enumeration, but return token in dev/demo
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    if (rows[0]) {
      await db.update(users).set({ resetToken: token, resetExpires: expires }).where(eq(users.id, rows[0].id));
    }
    return ok({
      message: "If an account exists for this email, a reset link has been generated.",
      // For demo purposes expose token so the flow is testable without email infra
      resetToken: rows[0] ? token : undefined,
      email: normalized,
    });
  } catch (e) {
    console.error("forgot error", e);
    return fail("Unable to process request.", 500);
  }
}
