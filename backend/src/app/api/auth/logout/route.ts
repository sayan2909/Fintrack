import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { getTokenFromRequest, clearAuthCookie } from "@/lib/auth";
import { destroySessionByToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (token) {
    await destroySessionByToken(token);
  }

  const res = ok({ loggedOut: true });
  clearAuthCookie(res);
  return res;
}
