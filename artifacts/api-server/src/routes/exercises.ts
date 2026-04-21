import { Router } from "express";
import { db, EQUIPMENT_CATALOG } from "@workspace/db";
import {
  exercisesTable,
  sessionExercisesTable,
  sessionVariantsTable,
  sessionsTable,
  programsTable,
  exerciseLogsTable,
  sessionLogsTable,
  checkinsTable,
  alertsTable,
  athleteExercisePreferencesTable,
} from "@workspace/db";
import { eq, and, or, isNull, inArray, desc, sql, max } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { getTodayLocalDate } from "../lib/dateUtils.js";
import { getAthleteCurrentPRs } from "../services/prService.js";

const router = Router();

const exerciseResponseFields = {
  id: exercisesTable.id,
  name: exercisesTable.name,
  category: exercisesTable.category,
  muscleGroups: exercisesTable.muscleGroups,
  equipment: exercisesTable.equipment,
  description: exercisesTable.description,
  demoUrl: exercisesTable.demoUrl,
  level: exercisesTable.level,
  createdBy: exercisesTable.createdBy,
} as const;

router.get("/exercises", authenticate, async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const exercises = await db.select(exerciseResponseFields)
      .from(exercisesTable)
      .where(or(isNull(exercisesTable.createdBy), eq(exercisesTable.createdBy, coachId)));

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
  category: z.enum(["compound", "isolation", "cardio", "mobility", "core", "power", "plyometric", "réathlétisation", "force", "pliométrie", "mobilité"]).optional(),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string().min(1).refine(
    v => EQUIPMENT_CATALOG.some(e => e.key === v),
    { message: "Clé d'équipement invalide" }
  )).optional(),
  description: z.string().optional(),
  demoUrl: z.string().url().optional().or(z.literal("")),
  level: z.enum(["débutant", "intermédiaire", "avancé"]).optional(),
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
      level: parsed.data.level ?? null,
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
        level: parsed.data.level ?? null,
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

router.get("/athlete/exercises", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;

    const [activeProgram] = await db.select({ id: programsTable.id })
      .from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)))
      .limit(1);

    let exercises: { id: string; name: string; category: string | null; muscleGroups: unknown; equipment: unknown; description: string | null; demoUrl: string | null; demoGifUrl: string | null; level: string | null }[] = [];

    if (activeProgram) {
      const programSessions = await db.select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(eq(sessionsTable.programId, activeProgram.id));

      const sessionIds = programSessions.map(s => s.id);

      if (sessionIds.length > 0) {
        const variants = await db.select({ id: sessionVariantsTable.id })
          .from(sessionVariantsTable)
          .where(inArray(sessionVariantsTable.sessionId, sessionIds));

        const variantIds = variants.map(v => v.id);

        if (variantIds.length > 0) {
          const sessionExs = await db.selectDistinct({ exerciseId: sessionExercisesTable.exerciseId })
            .from(sessionExercisesTable)
            .where(inArray(sessionExercisesTable.variantId, variantIds));

          const exerciseIds = sessionExs.map(e => e.exerciseId);

          if (exerciseIds.length > 0) {
            exercises = await db.select({
              id: exercisesTable.id,
              name: exercisesTable.name,
              category: exercisesTable.category,
              muscleGroups: exercisesTable.muscleGroups,
              equipment: exercisesTable.equipment,
              description: exercisesTable.description,
              demoUrl: exercisesTable.demoUrl,
              demoGifUrl: exercisesTable.demoGifUrl,
              level: exercisesTable.level,
            }).from(exercisesTable)
              .where(inArray(exercisesTable.id, exerciseIds));
          }
        }
      }
    }

    if (exercises.length === 0) {
      exercises = await db.select({
        id: exercisesTable.id,
        name: exercisesTable.name,
        category: exercisesTable.category,
        muscleGroups: exercisesTable.muscleGroups,
        equipment: exercisesTable.equipment,
        description: exercisesTable.description,
        demoUrl: exercisesTable.demoUrl,
        demoGifUrl: exercisesTable.demoGifUrl,
        level: exercisesTable.level,
      }).from(exercisesTable)
        .where(isNull(exercisesTable.createdBy));
    }

    res.json(exercises);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

async function getAthleteAllowedExerciseIds(athleteId: string): Promise<Set<string>> {
  const allowed = new Set<string>();

  const publicExercises = await db.select({ id: exercisesTable.id })
    .from(exercisesTable)
    .where(isNull(exercisesTable.createdBy));
  for (const e of publicExercises) allowed.add(e.id);

  const [activeProgram] = await db.select({ id: programsTable.id })
    .from(programsTable)
    .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)))
    .limit(1);

  if (activeProgram) {
    const programSessions = await db.select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(eq(sessionsTable.programId, activeProgram.id));

    const sessionIds = programSessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const variants = await db.select({ id: sessionVariantsTable.id })
        .from(sessionVariantsTable)
        .where(inArray(sessionVariantsTable.sessionId, sessionIds));

      const variantIds = variants.map(v => v.id);
      if (variantIds.length > 0) {
        const sessionExs = await db.selectDistinct({ exerciseId: sessionExercisesTable.exerciseId })
          .from(sessionExercisesTable)
          .where(inArray(sessionExercisesTable.variantId, variantIds));

        for (const e of sessionExs) allowed.add(e.exerciseId);
      }
    }
  }

  return allowed;
}

router.get("/athlete/exercises/:exerciseId", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const exerciseId = String(req.params["exerciseId"]);
    const athleteId = req.user!.userId;

    const allowedIds = await getAthleteAllowedExerciseIds(athleteId);
    if (!allowedIds.has(exerciseId)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Exercice non accessible" } });
      return;
    }

    const [exercise] = await db.select({
      id: exercisesTable.id,
      name: exercisesTable.name,
      category: exercisesTable.category,
      muscleGroups: exercisesTable.muscleGroups,
      equipment: exercisesTable.equipment,
      description: exercisesTable.description,
      demoUrl: exercisesTable.demoUrl,
      demoGifUrl: exercisesTable.demoGifUrl,
      level: exercisesTable.level,
    }).from(exercisesTable).where(eq(exercisesTable.id, exerciseId));

    if (!exercise) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercice introuvable" } });
      return;
    }

    const history = await db.select({
      id: exerciseLogsTable.id,
      setsCompleted: exerciseLogsTable.setsCompleted,
      repsPerSet: exerciseLogsTable.repsPerSet,
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      notes: exerciseLogsTable.notes,
      createdAt: exerciseLogsTable.createdAt,
      sessionLogId: exerciseLogsTable.sessionLogId,
    })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(and(
        eq(exerciseLogsTable.exerciseId, exerciseId),
        eq(sessionLogsTable.athleteId, athleteId),
      ))
      .orderBy(desc(exerciseLogsTable.createdAt))
      .limit(20);

    const parsedHistory = history.map(h => ({
      ...h,
      loadKgUsed: h.loadKgUsed != null ? parseFloat(String(h.loadKgUsed)) : null,
    }));

    const [prRow] = await db.select({ maxLoad: max(exerciseLogsTable.loadKgUsed) })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(and(
        eq(exerciseLogsTable.exerciseId, exerciseId),
        eq(sessionLogsTable.athleteId, athleteId),
      ));

    const prKg = prRow?.maxLoad != null ? parseFloat(String(prRow.maxLoad)) : null;

    const [prefs] = await db.select({
      preferredSets: athleteExercisePreferencesTable.preferredSets,
      preferredReps: athleteExercisePreferencesTable.preferredReps,
      preferredLoadKg: athleteExercisePreferencesTable.preferredLoadKg,
    })
      .from(athleteExercisePreferencesTable)
      .where(and(
        eq(athleteExercisePreferencesTable.athleteId, athleteId),
        eq(athleteExercisePreferencesTable.exerciseId, exerciseId),
      ))
      .limit(1);

    res.json({
      ...exercise,
      prKg,
      history: parsedHistory,
      preferences: prefs
        ? {
            sets: prefs.preferredSets,
            reps: prefs.preferredReps,
            loadKg: prefs.preferredLoadKg != null ? parseFloat(String(prefs.preferredLoadKg)) : null,
          }
        : null,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const doNowBodySchema = z.object({
  targetSets: z.number().int().min(1).max(20).optional(),
  targetReps: z.union([z.number().int().min(1).max(100), z.string().min(1)]).optional(),
  targetLoad: z.number().min(0).max(10000).optional(),
  targetRestSeconds: z.number().int().min(15).max(600).optional(),
});

router.post("/athlete/exercises/:exerciseId/do-now", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const exerciseId = String(req.params["exerciseId"]);
    const athleteId = req.user!.userId;

    const bodyParsed = doNowBodySchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const bodyParams = bodyParsed.data;
    const today = getTodayLocalDate();

    const allowedIds = await getAthleteAllowedExerciseIds(athleteId);
    if (!allowedIds.has(exerciseId)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Exercice non accessible" } });
      return;
    }

    const [exercise] = await db.select({
      id: exercisesTable.id,
      name: exercisesTable.name,
      category: exercisesTable.category,
      muscleGroups: exercisesTable.muscleGroups,
      equipment: exercisesTable.equipment,
      description: exercisesTable.description,
      demoUrl: exercisesTable.demoUrl,
      demoGifUrl: exercisesTable.demoGifUrl,
      level: exercisesTable.level,
    }).from(exercisesTable).where(eq(exercisesTable.id, exerciseId));

    if (!exercise) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exercice introuvable" } });
      return;
    }

    const [todayCheckin] = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athleteId), eq(checkinsTable.date, today)));

    const painAlerts = todayCheckin ? await db.select({ id: alertsTable.id }).from(alertsTable)
      .where(and(
        eq(alertsTable.athleteId, athleteId),
        eq(alertsTable.type, "pain"),
        eq(alertsTable.isResolved, false)
      )) : [];

    const variantMode = todayCheckin
      ? (painAlerts.length > 0 ? "recovery" : todayCheckin.sessionMode)
      : "normal";

    const lastLog = await db.select({
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      setsCompleted: exerciseLogsTable.setsCompleted,
      createdAt: exerciseLogsTable.createdAt,
    })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(and(
        eq(exerciseLogsTable.exerciseId, exerciseId),
        eq(sessionLogsTable.athleteId, athleteId),
      ))
      .orderBy(desc(exerciseLogsTable.createdAt))
      .limit(1);

    const lastUsedLoad = lastLog[0]?.loadKgUsed ? parseFloat(String(lastLog[0].loadKgUsed)) : null;
    const lastUsedDate = lastLog[0]?.createdAt ? new Date(lastLog[0].createdAt).toISOString().split("T")[0]! : null;

    const [newLog] = await db.insert(sessionLogsTable).values({
      athleteId,
      sessionId: null,
      variantMode,
      checkinId: todayCheckin?.id ?? null,
      isFreeSession: true,
      freeSessionName: exercise.name,
      startedAt: new Date(),
    }).returning();

    const athletePRs = await getAthleteCurrentPRs(athleteId);

    res.status(201).json({
      sessionLogId: newLog!.id,
      name: exercise.name,
      mode: variantMode,
      isFreeSession: true,
      isSingleExercise: true,
      adaptScore: todayCheckin?.adaptScore ?? 50,
      coachNotes: null,
      estimatedDurationMin: null,
      exercises: [{
        id: `do-now-${exercise.id}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category ?? null,
        imageUrl: exercise.demoUrl ?? null,
        gifUrl: exercise.demoGifUrl ?? null,
        muscleGroups: exercise.muscleGroups ?? [],
        equipment: exercise.equipment ?? [],
        description: exercise.description ?? null,
        demoUrl: exercise.demoUrl ?? null,
        orderIndex: 0,
        sets: bodyParams.targetSets ?? 3,
        reps: bodyParams.targetReps != null ? String(bodyParams.targetReps) : "10",
        nominalLoadKg: bodyParams.targetLoad ?? lastUsedLoad ?? null,
        adaptedLoadKg: bodyParams.targetLoad ?? lastUsedLoad ?? null,
        restSeconds: bodyParams.targetRestSeconds ?? 90,
        durationSeconds: null,
        coachCue: null,
        tempo: null,
        lastUsedLoadKg: lastUsedLoad,
        lastUsedDate: lastUsedDate,
      }],
      athletePRs,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
