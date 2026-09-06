import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    await db
      .update(users)
      .set({ hasSeenTour: true, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return ok({ message: "Tour marked as completed.", hasSeenTour: true });
  } catch (e) {
    console.error("tour complete error", e);
    return fail("Unable to update tour status.", 500);
  }
}
