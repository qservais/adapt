import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/exercises", authenticate, async (req, res) => {
  try {
    let query = db.select().from(exercisesTable);
    const exercises = await query;

    let filtered = exercises;
    if (req.query.category) {
      filtered = filtered.filter(e => e.category === req.query.category);
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
      demoUrl: e.demoUrl,
    })));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["compound", "isolation", "cardio", "mobility"]).optional(),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
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
      demoUrl: exercise.demoUrl,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
