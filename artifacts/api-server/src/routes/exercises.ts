import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable, sessionExercisesTable } from "@workspace/db";
import { eq, ilike, and, inArray } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/exercises", authenticate, async (req, res) => {
  try {
    const exercises = await db.select().from(exercisesTable);

    let filtered = exercises;
    if (req.query.category) {
      filtered = filtered.filter(e => e.category === req.query.category);
    }
    if (req.query.muscleGroup) {
      const mg = (req.query.muscleGroup as string).toLowerCase();
      filtered = filtered.filter(e => {
        const mgs = e.muscleGroups as string[] | null;
        return mgs && mgs.some(m => m.toLowerCase().includes(mg));
      });
    }
    if (req.query.q) {
      const q = (req.query.q as string).toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(q));
    }

    res.json(filtered.map(e => ({
      id: e.id,
      name: e.name,
      category: e.category,
      muscleGroups: e.muscleGroups,
      equipment: e.equipment,
      description: (e as unknown as { description?: string }).description ?? null,
      demoUrl: e.demoUrl,
    })));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["compound", "isolation", "cardio", "mobility", "core", "power"]).optional(),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  description: z.string().optional(),
  demoUrl: z.string().optional(),
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
      demoUrl: parsed.data.demoUrl,
      createdBy: req.user!.userId,
    }).returning();

    res.status(201).json({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      description: null,
      demoUrl: exercise.demoUrl,
    });
  } catch (err) {
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

  try {
    const [exercise] = await db.update(exercisesTable)
      .set({
        name: parsed.data.name,
        category: parsed.data.category,
        muscleGroups: parsed.data.muscleGroups ?? null,
        equipment: parsed.data.equipment ?? null,
        demoUrl: parsed.data.demoUrl,
      })
      .where(eq(exercisesTable.id, exerciseId))
      .returning();

    if (!exercise) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercise not found" } });
      return;
    }

    res.json({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      description: null,
      demoUrl: exercise.demoUrl,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/exercises/:exerciseId", authenticate, requireRole("coach"), async (req, res) => {
  const exerciseId = String(req.params["exerciseId"]);
  try {
    const usedInSessions = await db.select({ id: sessionExercisesTable.id })
      .from(sessionExercisesTable)
      .where(eq(sessionExercisesTable.exerciseId, exerciseId))
      .limit(1);

    if (usedInSessions.length > 0) {
      res.status(409).json({ error: { code: "CONFLICT", message: "Cet exercice est utilisé dans un programme. Retirez-le d'abord des séances." } });
      return;
    }

    await db.delete(exercisesTable).where(eq(exercisesTable.id, exerciseId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
