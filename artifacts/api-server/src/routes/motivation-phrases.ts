import { Router } from "express";
import { db } from "@workspace/db";
import { motivationPhrasesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  text: z.string().min(1).max(500),
});

const updateSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  active: z.boolean().optional(),
});

router.get("/coach/motivation-phrases", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const rows = await db
      .select()
      .from(motivationPhrasesTable)
      .where(eq(motivationPhrasesTable.coachId, coachId))
      .orderBy(desc(motivationPhrasesTable.createdAt));
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/motivation-phrases", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const [row] = await db
      .insert(motivationPhrasesTable)
      .values({ coachId, text: parsed.data.text })
      .returning();
    res.status(201).json({ ...row, createdAt: row.createdAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/motivation-phrases/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: motivationPhrasesTable.id })
      .from(motivationPhrasesTable)
      .where(and(eq(motivationPhrasesTable.id, id), eq(motivationPhrasesTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Phrase introuvable" } });
      return;
    }
    const updates: Partial<typeof motivationPhrasesTable.$inferInsert> = {};
    if (parsed.data.text !== undefined) updates.text = parsed.data.text;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    const [row] = await db
      .update(motivationPhrasesTable)
      .set(updates)
      .where(eq(motivationPhrasesTable.id, id))
      .returning();
    res.json({ ...row, createdAt: row.createdAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/motivation-phrases/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: motivationPhrasesTable.id })
      .from(motivationPhrasesTable)
      .where(and(eq(motivationPhrasesTable.id, id), eq(motivationPhrasesTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Phrase introuvable" } });
      return;
    }
    await db.delete(motivationPhrasesTable).where(eq(motivationPhrasesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
