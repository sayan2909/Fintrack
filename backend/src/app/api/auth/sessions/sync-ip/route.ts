import { NextRequest } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, getTokenFromRequest } from "@/lib/auth";
import { normalizeIp } from "@/lib/session";
import { ok, unauthorized, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized("Not authenticated.");

  const token = getTokenFromRequest(req);
  if (!token) return unauthorized("No token found.");

  try {
    const body = await req.json().catch(() => ({}));
    const rawIp = body?.ipAddress || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
    if (!rawIp) {
      return fail("No IP address provided.", 400);
    }

    const cleanIp = normalizeIp(rawIp);
    if (cleanIp && cleanIp !== "127.0.0.1") {
      await db
        .update(sessions)
        .set({ ipAddress: cleanIp, lastActive: new Date() })
        .where(eq(sessions.token, token));
    }

    return ok({ success: true, ipAddress: cleanIp });
  } catch (err) {
    console.error("[Sync IP] Error updating session IP:", err);
    return fail("Unable to update session IP.", 500);
  }
}
