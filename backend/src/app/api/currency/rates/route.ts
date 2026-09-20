import { NextRequest } from "next/server";
import { getLiveRates, BASE_RATES_USD } from "@/lib/currency";
import { ok } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    const rates = await getLiveRates();
    return ok({
      base: "USD",
      rates: rates || BASE_RATES_USD,
      timestamp: Date.now(),
    });
  } catch {
    return ok({
      base: "USD",
      rates: BASE_RATES_USD,
      timestamp: Date.now(),
    });
  }
}
