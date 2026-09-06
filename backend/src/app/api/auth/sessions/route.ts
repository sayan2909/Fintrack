import { NextRequest } from "next/server";
import { getAuthUser, getTokenFromRequest } from "@/lib/auth";
import {
  listUserSessions,
  destroySessionById,
  destroyAllOtherSessions,
} from "@/lib/session";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized("Not authenticated.");

  const currentToken = getTokenFromRequest(req);
  const sessionList = await listUserSessions(user.id, currentToken);

  return ok({
    sessions: sessionList,
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized("Not authenticated.");

  const currentToken = getTokenFromRequest(req);
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");
  const revokeAllOther = searchParams.get("all") === "true";

  if (revokeAllOther) {
    if (!currentToken) return fail("Cannot identify current session.", 400);
    const success = await destroyAllOtherSessions(user.id, currentToken);
    return ok({ revokedAllOther: success, message: "Logged out of all other devices." });
  }

  if (sessionId) {
    const success = await destroySessionById(sessionId, user.id);
    if (!success) {
      return fail("Failed to revoke session.", 400);
    }
    return ok({ revoked: true, message: "Session revoked successfully." });
  }

  return fail("Session ID or ?all=true required.", 400);
}
