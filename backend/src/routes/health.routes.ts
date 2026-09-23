import { Router } from "express";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/health
router.get("/", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
