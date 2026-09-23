import { Router } from "express";
import { getLiveRates, BASE_RATES_USD } from "@/lib/currency";
import { ok } from "@/lib/response";

const router = Router();

// GET /api/currency/rates
router.get("/rates", async (_req, res) => {
  try {
    const rates = await getLiveRates();
    return ok(res, {
      base: "USD",
      rates: rates || BASE_RATES_USD,
      timestamp: Date.now(),
    });
  } catch {
    return ok(res, {
      base: "USD",
      rates: BASE_RATES_USD,
      timestamp: Date.now(),
    });
  }
});

export default router;
