import { Router } from "express";
import { db } from "@workspace/db";
import { dailyStepsTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(200000),
  goal: z.number().int().min(1000).max(100000).optional(),
  source: z.enum(["manual", "health"]).optional(),
});

router.get("/stats/steps", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(parseInt(String(req.query.days ?? "30"), 10), 90);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(dailyStepsTable)
      .where(and(eq(dailyStepsTable.userId, userId), gte(dailyStepsTable.date, cutoffStr)))
      .orderBy(desc(dailyStepsTable.date));

    const today = new Date().toISOString().slice(0, 10);
    const todayRow = rows.find((r) => r.date === today) ?? null;

    return res.json({ today: todayRow, history: rows });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/stats/steps", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    }
    const { date, steps, goal, source } = parsed.data;

    const [existing] = await db
      .select({ id: dailyStepsTable.id })
      .from(dailyStepsTable)
      .where(and(eq(dailyStepsTable.userId, userId), eq(dailyStepsTable.date, date)));

    let row;
    if (existing) {
      [row] = await db
        .update(dailyStepsTable)
        .set({
          steps,
          ...(goal !== undefined && { goal }),
          ...(source !== undefined && { source }),
        })
        .where(eq(dailyStepsTable.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(dailyStepsTable)
        .values({ userId, date, steps, goal: goal ?? 10000, source: source ?? "manual" })
        .returning();
    }

    return res.json(row);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
