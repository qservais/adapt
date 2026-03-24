import { Router } from "express";
import { db } from "@workspace/db";
import { guidesTable, contentRoutinesTable, usersTable } from "@workspace/db";
import { eq, asc, or, isNull, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const guideBodySchema = z.object({
  title: z.string().min(1).max(200),
  contentMarkdown: z.string().default(""),
  category: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const routineBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.string().min(1).max(50),
  durationMin: z.number().int().positive().optional().nullable(),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
});

async function resolveCoachId(userId: string, role: string): Promise<string | null> {
  if (role === "coach") return userId;
  const [athlete] = await db
    .select({ coachId: usersTable.coachId })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return athlete?.coachId ?? null;
}

router.get("/guides", authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const coachId = await resolveCoachId(user.userId, user.role);
    const condition = coachId
      ? or(eq(guidesTable.coachId, coachId), isNull(guidesTable.coachId))
      : isNull(guidesTable.coachId);
    const guides = await db
      .select()
      .from(guidesTable)
      .where(condition)
      .orderBy(asc(guidesTable.sortOrder), asc(guidesTable.createdAt));
    res.json(guides);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/guides/:id", authenticate, async (req, res) => {
  try {
    const id = String(req.params.id);
    const user = req.user!;
    const coachId = await resolveCoachId(user.userId, user.role);
    const [guide] = await db.select().from(guidesTable).where(eq(guidesTable.id, id));
    if (!guide) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Guide introuvable" } });
    if (guide.coachId !== null && guide.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    return res.json(guide);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/guides", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const parsed = guideBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const { title, contentMarkdown, category, sortOrder } = parsed.data;
    const [guide] = await db.insert(guidesTable).values({
      title,
      contentMarkdown,
      category: category ?? null,
      sortOrder: sortOrder ?? 0,
      coachId: req.user!.userId,
    }).returning();
    return res.status(201).json(guide);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/guides/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const coachId = req.user!.userId;
    const parsed = guideBodySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const [existing] = await db.select({ coachId: guidesTable.coachId }).from(guidesTable).where(eq(guidesTable.id, id));
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Guide introuvable" } });
    if (existing.coachId !== null && existing.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    const [guide] = await db
      .update(guidesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(guidesTable.id, id))
      .returning();
    return res.json(guide);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/guides/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const coachId = req.user!.userId;
    const [existing] = await db.select({ coachId: guidesTable.coachId }).from(guidesTable).where(eq(guidesTable.id, id));
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Guide introuvable" } });
    if (existing.coachId !== null && existing.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    await db.delete(guidesTable).where(eq(guidesTable.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/content-routines", authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const coachId = await resolveCoachId(user.userId, user.role);
    const category = typeof req.query.category === "string" ? req.query.category : undefined;

    const ownerCondition = coachId
      ? or(eq(contentRoutinesTable.coachId, coachId), isNull(contentRoutinesTable.coachId))
      : isNull(contentRoutinesTable.coachId);

    const fullCondition = category
      ? and(ownerCondition, eq(contentRoutinesTable.category, category))
      : ownerCondition;

    const routines = await db
      .select()
      .from(contentRoutinesTable)
      .where(fullCondition)
      .orderBy(asc(contentRoutinesTable.category), asc(contentRoutinesTable.createdAt));

    return res.json(routines);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/content-routines/:id", authenticate, async (req, res) => {
  try {
    const id = String(req.params.id);
    const user = req.user!;
    const coachId = await resolveCoachId(user.userId, user.role);
    const [routine] = await db.select().from(contentRoutinesTable).where(eq(contentRoutinesTable.id, id));
    if (!routine) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine introuvable" } });
    if (routine.coachId !== null && routine.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    return res.json(routine);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/content-routines", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const parsed = routineBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const { title, description, category, durationMin, exercises } = parsed.data;
    const [routine] = await db.insert(contentRoutinesTable).values({
      title,
      description: description ?? null,
      category,
      durationMin: durationMin ?? null,
      exercises: exercises ?? [],
      coachId: req.user!.userId,
    }).returning();
    return res.status(201).json(routine);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/content-routines/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const coachId = req.user!.userId;
    const parsed = routineBodySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const [existing] = await db.select({ coachId: contentRoutinesTable.coachId }).from(contentRoutinesTable).where(eq(contentRoutinesTable.id, id));
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine introuvable" } });
    if (existing.coachId !== null && existing.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    const [routine] = await db
      .update(contentRoutinesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contentRoutinesTable.id, id))
      .returning();
    return res.json(routine);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/content-routines/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const coachId = req.user!.userId;
    const [existing] = await db.select({ coachId: contentRoutinesTable.coachId }).from(contentRoutinesTable).where(eq(contentRoutinesTable.id, id));
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine introuvable" } });
    if (existing.coachId !== null && existing.coachId !== coachId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    await db.delete(contentRoutinesTable).where(eq(contentRoutinesTable.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
