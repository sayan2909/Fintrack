import { NextRequest } from "next/server";
import { getAuthUser, getActiveSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return unauthorized("No active session.");
  }

  const session = await getActiveSession(req);

  return ok({
    user,
    session,
  });
}
