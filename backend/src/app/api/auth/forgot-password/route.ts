import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ok, fail } from "@/lib/response";
import { validateEmail } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return fail(
        `Too many password reset requests from this network. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting again.`,
        429
      );
    }

    const body = await req.json();
    const email = body?.email;
    if (!email || !validateEmail(String(email).toLowerCase())) {
      return fail("Please enter a valid email address.", 400);
    }
    const normalized = String(email).trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    
    if (!rows[0]) {
      return fail("No FinTrack account found with this email address. Please check the spelling or sign up.", 404);
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
    await db.update(users).set({ resetToken: token, resetExpires: expires }).where(eq(users.id, rows[0].id));

    return ok({
      message: "Password reset link generated successfully.",
      resetToken: token,
      resetUrl: `/reset-password?token=${token}`,
      email: normalized,
      expiresIn: "1 hour",
    });
  } catch (e) {
    console.error("forgot password error:", e);
    return fail("Unable to process password reset request.", 500);
  }
}
