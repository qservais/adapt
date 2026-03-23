import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable, sessionExercisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const exerciseResponseFields = {
  id: exercisesTable.id,
  name: exercisesTable.name,
  category: exercisesTable.category,
  muscleGroups: exercisesTable.muscleGroups,
  equipment: exercisesTable.equipment,
  description: exercisesTable.description,
  demoUrl: exercisesTable.demoUrl,
} as const;

router.get("/exercises", authenticate, async (req, res) => {
  try {
    const exercises = await db.select(exerciseResponseFields).from(exercisesTable);

    let filtered = exercises;
    if (req.query["category"]) {
      filtered = filtered.filter(e => e.category === req.query["category"]);
    }
    if (req.query["muscleGroup"]) {
      const mg = (req.query["muscleGroup"] as string).toLowerCase();
      filtered = filtered.filter(e => {
        const mgs = e.muscleGroups as string[] | null;
        return mgs != null && mgs.some(m => m.toLowerCase().includes(mg));
      });
    }
    if (req.query["q"]) {
      const q = (req.query["q"] as string).toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(q));
    }

    res.json(filtered);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["compound", "isolation", "cardio", "mobility", "core", "power"]).optional(),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  description: z.string().optional(),
  demoUrl: z.string().url().optional().or(z.literal("")),
});

router.post("/exercises", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const [exercise] = await db.insert(exercisesTable).values({
      name: parsed.data.name,
      category: parsed.data.category,
      muscleGroups: parsed.data.muscleGroups ?? null,
      equipment: parsed.data.equipment ?? null,
      description: parsed.data.description ?? null,
      demoUrl: parsed.data.demoUrl || null,
      createdBy: req.user!.userId,
    }).returning(exerciseResponseFields);

    res.status(201).json(exercise);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/exercises/:exerciseId", authenticate, requireRole("coach"), async (req, res) => {
  const exerciseId = String(req.params["exerciseId"]);
  const parsed = createExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const coachId = req.user!.userId;
  try {
    const existing = await db.select({ id: exercisesTable.id, createdBy: exercisesTable.createdBy })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    if (!existing[0]) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercice introuvable" } });
      return;
    }
    if (existing[0].createdBy !== coachId) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Vous ne pouvez modifier que vos propres exercices" } });
      return;
    }

    const [exercise] = await db.update(exercisesTable)
      .set({
        name: parsed.data.name,
        category: parsed.data.category,
        muscleGroups: parsed.data.muscleGroups ?? null,
        equipment: parsed.data.equipment ?? null,
        description: parsed.data.description ?? null,
        demoUrl: parsed.data.demoUrl || null,
      })
      .where(and(eq(exercisesTable.id, exerciseId), eq(exercisesTable.createdBy, coachId)))
      .returning(exerciseResponseFields);

    if (!exercise) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercice introuvable" } });
      return;
    }

    res.json(exercise);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/exercises/:exerciseId", authenticate, requireRole("coach"), async (req, res) => {
  const exerciseId = String(req.params["exerciseId"]);
  const coachId = req.user!.userId;
  try {
    const existing = await db.select({ id: exercisesTable.id, createdBy: exercisesTable.createdBy })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    if (!existing[0]) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercice introuvable" } });
      return;
    }
    if (existing[0].createdBy !== coachId) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Vous ne pouvez supprimer que vos propres exercices" } });
      return;
    }

    const usedInSessions = await db.select({ id: sessionExercisesTable.id })
      .from(sessionExercisesTable)
      .where(eq(sessionExercisesTable.exerciseId, exerciseId))
      .limit(1);

    if (usedInSessions.length > 0) {
      res.status(409).json({ error: { code: "CONFLICT", message: "Cet exercice est utilisé dans un programme. Retirez-le d'abord des séances." } });
      return;
    }

    await db.delete(exercisesTable).where(
      and(eq(exercisesTable.id, exerciseId), eq(exercisesTable.createdBy, coachId))
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
