import { Router } from "express";
import { db } from "@workspace/db";
import { programsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable, exercisesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/programs", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programs = await db.select({
      id: programsTable.id,
      name: programsTable.name,
      athleteId: programsTable.athleteId,
      durationWeeks: programsTable.durationWeeks,
      startDate: programsTable.startDate,
      isActive: programsTable.isActive,
      createdAt: programsTable.createdAt,
      athleteFirstName: usersTable.firstName,
      athleteLastName: usersTable.lastName,
    })
      .from(programsTable)
      .innerJoin(usersTable, eq(programsTable.athleteId, usersTable.id))
      .where(eq(programsTable.coachId, req.user!.userId));

    res.json(programs.map(p => ({
      id: p.id,
      name: p.name,
      athleteId: p.athleteId,
      athleteName: `${p.athleteFirstName} ${p.athleteLastName || ""}`.trim(),
      durationWeeks: p.durationWeeks,
      startDate: p.startDate,
      isActive: p.isActive,
      createdAt: p.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  athleteId: z.string().uuid(),
  durationWeeks: z.number().int().min(1),
  startDate: z.string().optional(),
});

router.post("/programs", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createProgramSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    // Verify athlete belongs to coach
    const [athlete] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Athlete not linked to you" } });
      return;
    }

    const [program] = await db.insert(programsTable).values({
      coachId: req.user!.userId,
      athleteId: parsed.data.athleteId,
      name: parsed.data.name,
      description: parsed.data.description,
      durationWeeks: parsed.data.durationWeeks,
      startDate: parsed.data.startDate,
    }).returning();

    const user = athlete;
    res.status(201).json({
      id: program.id,
      name: program.name,
      athleteId: program.athleteId,
      athleteName: `${user.firstName} ${user.lastName || ""}`.trim(),
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      createdAt: program.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/programs/:programId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.id, req.params.programId), eq(programsTable.coachId, req.user!.userId)));

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const sessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, program.id))
      .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

    const sessionsWithVariants = await Promise.all(sessions.map(async (session) => {
      const variants = await db.select().from(sessionVariantsTable)
        .where(eq(sessionVariantsTable.sessionId, session.id));

      const variantsWithExercises = await Promise.all(variants.map(async (variant) => {
        const exercises = await db.select({
          id: sessionExercisesTable.id,
          exerciseId: sessionExercisesTable.exerciseId,
          orderIndex: sessionExercisesTable.orderIndex,
          sets: sessionExercisesTable.sets,
          reps: sessionExercisesTable.reps,
          loadKg: sessionExercisesTable.loadKg,
          restSeconds: sessionExercisesTable.restSeconds,
          coachCue: sessionExercisesTable.coachCue,
          exerciseName: exercisesTable.name,
        })
          .from(sessionExercisesTable)
          .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
          .where(eq(sessionExercisesTable.variantId, variant.id))
          .orderBy(sessionExercisesTable.orderIndex);

        return {
          id: variant.id,
          mode: variant.mode,
          volumeModifier: parseFloat(variant.volumeModifier || "1.0"),
          intensityModifier: parseFloat(variant.intensityModifier || "1.0"),
          notes: variant.notes,
          exercises: exercises.map(ex => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            orderIndex: ex.orderIndex,
            sets: ex.sets,
            reps: ex.reps,
            nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
            adaptedLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
            restSeconds: ex.restSeconds,
            coachCue: ex.coachCue,
          })),
        };
      }));

      return {
        id: session.id,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        name: session.name,
        type: session.type,
        estimatedDurationMin: session.estimatedDurationMin,
        coachNotes: session.coachNotes,
        variants: variantsWithExercises,
      };
    }));

    res.json({
      id: program.id,
      name: program.name,
      description: program.description,
      athleteId: program.athleteId,
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      sessions: sessionsWithVariants,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/programs/:programId", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createProgramSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const [program] = await db.update(programsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(programsTable.id, req.params.programId), eq(programsTable.coachId, req.user!.userId)))
      .returning();

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const [athlete] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, program.athleteId));

    res.json({
      id: program.id,
      name: program.name,
      athleteId: program.athleteId,
      athleteName: `${athlete?.firstName || ""} ${athlete?.lastName || ""}`.trim(),
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      createdAt: program.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createSessionSchema = z.object({
  weekNumber: z.number().int().min(1),
  dayNumber: z.number().int().min(1),
  name: z.string().min(1),
  type: z.enum(["strength", "cardio", "hybrid", "mobility"]),
  estimatedDurationMin: z.number().int().optional(),
  coachNotes: z.string().optional(),
  variants: z.array(z.object({
    mode: z.enum(["performance", "normal", "adapt", "recovery"]),
    notes: z.string().optional(),
    exercises: z.array(z.object({
      exerciseId: z.string().uuid(),
      orderIndex: z.number().int(),
      sets: z.number().int(),
      reps: z.string().optional(),
      loadKg: z.number().optional(),
      restSeconds: z.number().int().optional(),
      coachCue: z.string().optional(),
    })).optional(),
  })).optional(),
});

router.post("/programs/:programId/sessions", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.id, req.params.programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const [session] = await db.insert(sessionsTable).values({
      programId: req.params.programId,
      weekNumber: parsed.data.weekNumber,
      dayNumber: parsed.data.dayNumber,
      name: parsed.data.name,
      type: parsed.data.type,
      estimatedDurationMin: parsed.data.estimatedDurationMin,
      coachNotes: parsed.data.coachNotes,
    }).returning();

    if (parsed.data.variants) {
      for (const variant of parsed.data.variants) {
        const [sv] = await db.insert(sessionVariantsTable).values({
          sessionId: session.id,
          mode: variant.mode,
          notes: variant.notes,
        }).returning();

        if (variant.exercises) {
          for (const ex of variant.exercises) {
            await db.insert(sessionExercisesTable).values({
              variantId: sv.id,
              exerciseId: ex.exerciseId,
              orderIndex: ex.orderIndex,
              sets: ex.sets,
              reps: ex.reps,
              loadKg: ex.loadKg?.toString(),
              restSeconds: ex.restSeconds,
              coachCue: ex.coachCue,
            });
          }
        }
      }
    }

    res.status(201).json({ success: true, message: "Session added" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/programs/:programId/sessions/:sessionId", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSessionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const updates: Record<string, any> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.weekNumber) updates.weekNumber = parsed.data.weekNumber;
    if (parsed.data.dayNumber) updates.dayNumber = parsed.data.dayNumber;
    if (parsed.data.type) updates.type = parsed.data.type;
    if (parsed.data.estimatedDurationMin) updates.estimatedDurationMin = parsed.data.estimatedDurationMin;
    if (parsed.data.coachNotes !== undefined) updates.coachNotes = parsed.data.coachNotes;

    await db.update(sessionsTable).set(updates).where(eq(sessionsTable.id, req.params.sessionId));
    res.json({ success: true, message: "Session updated" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
