import { Router } from "express";
import { db } from "@workspace/db";
import {
  checkinsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable,
  exercisesTable, programsTable, sessionLogsTable, exerciseLogsTable, usersTable,
} from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { calculateAdaptedLoad } from "../services/adapt-engine.js";
import { z } from "zod";

const router = Router();

router.get("/sessions/today", authenticate, requireRole("athlete"), async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  // Check if checked in today
  const [checkin] = await db.select().from(checkinsTable)
    .where(and(eq(checkinsTable.athleteId, req.user!.userId), eq(checkinsTable.date, today)));

  if (!checkin) {
    res.status(403).json({ error: { code: "SESSION_NOT_UNLOCKED", message: "Complete your check-in first" } });
    return;
  }

  // Check for existing session log today
  const [existingLog] = await db.select().from(sessionLogsTable)
    .where(and(eq(sessionLogsTable.athleteId, req.user!.userId), eq(sessionLogsTable.checkinId, checkin.id)));

  if (existingLog) {
    // Return the existing session log data
    return sendSessionDetail(res, existingLog, checkin);
  }

  const mode = checkin.sessionMode;

  // Check for pain override (P1 alert active)
  const { alertsTable: alerts } = await import("@workspace/db");
  const painAlerts = await db.select().from(alertsTable)
    .where(and(
      eq(alertsTable.athleteId, req.user!.userId),
      eq(alertsTable.type, "pain"),
      eq(alertsTable.isResolved, false)
    ));

  const forcedMode = painAlerts.length > 0 ? "recovery" : mode;

  // Find active program
  const [program] = await db.select().from(programsTable)
    .where(and(eq(programsTable.athleteId, req.user!.userId), eq(programsTable.isActive, true)));

  let sessionId: string | null = null;
  let sessionName = "Session libre";
  let estimatedDuration: number | null = null;
  let coachNotes: string | null = null;
  let exercises: any[] = [];

  if (program) {
    const dayOfWeek = new Date().getDay();
    const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
    const dayNum = dayMap[dayOfWeek] ?? 1;

    const [session] = await db.select().from(sessionsTable)
      .where(and(eq(sessionsTable.programId, program.id), eq(sessionsTable.dayNumber, dayNum)));

    if (session) {
      sessionId = session.id;
      sessionName = session.name;
      estimatedDuration = session.estimatedDurationMin;
      coachNotes = session.coachNotes;

      // Get variant for mode
      let [variant] = await db.select().from(sessionVariantsTable)
        .where(and(eq(sessionVariantsTable.sessionId, session.id), eq(sessionVariantsTable.mode, forcedMode)));

      // Fallback to normal if variant not found
      if (!variant) {
        [variant] = await db.select().from(sessionVariantsTable)
          .where(and(eq(sessionVariantsTable.sessionId, session.id), eq(sessionVariantsTable.mode, "normal")));
      }

      if (variant) {
        const exs = await db.select({
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

        exercises = exs.map(ex => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          orderIndex: ex.orderIndex,
          sets: ex.sets,
          reps: ex.reps,
          nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
          adaptedLoadKg: calculateAdaptedLoad(ex.loadKg ? parseFloat(ex.loadKg) : null, forcedMode),
          restSeconds: ex.restSeconds,
          coachCue: ex.coachCue,
        }));
      }
    }
  }

  // Create session log
  const [sessionLog] = await db.insert(sessionLogsTable).values({
    athleteId: req.user!.userId,
    sessionId: sessionId,
    variantMode: forcedMode,
    checkinId: checkin.id,
  }).returning();

  res.json({
    sessionLogId: sessionLog.id,
    sessionId,
    name: sessionName,
    mode: forcedMode,
    estimatedDurationMin: estimatedDuration,
    coachNotes,
    exercises,
    adaptScore: checkin.adaptScore,
    overriddenByCoach: painAlerts.length > 0,
  });
});

async function sendSessionDetail(res: any, sessionLog: any, checkin: any) {
  let exercises: any[] = [];

  if (sessionLog.sessionId) {
    let [variant] = await db.select().from(sessionVariantsTable)
      .where(and(eq(sessionVariantsTable.sessionId, sessionLog.sessionId), eq(sessionVariantsTable.mode, sessionLog.variantMode)));

    if (!variant) {
      [variant] = await db.select().from(sessionVariantsTable)
        .where(and(eq(sessionVariantsTable.sessionId, sessionLog.sessionId), eq(sessionVariantsTable.mode, "normal")));
    }

    if (variant) {
      const exs = await db.select({
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

      exercises = exs.map(ex => ({
        id: ex.id,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        reps: ex.reps,
        nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
        adaptedLoadKg: calculateAdaptedLoad(ex.loadKg ? parseFloat(ex.loadKg) : null, sessionLog.variantMode),
        restSeconds: ex.restSeconds,
        coachCue: ex.coachCue,
      }));
    }
  }

  return res.json({
    sessionLogId: sessionLog.id,
    sessionId: sessionLog.sessionId,
    name: "Séance du jour",
    mode: sessionLog.variantMode,
    estimatedDurationMin: null,
    coachNotes: null,
    exercises,
    adaptScore: checkin.adaptScore,
    overriddenByCoach: false,
  });
}

router.put("/sessions/:sessionId/start", authenticate, async (req, res) => {
  try {
    await db.update(sessionLogsTable)
      .set({ startedAt: new Date() })
      .where(and(
        eq(sessionLogsTable.id, req.params.sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));
    res.json({ success: true, message: "Session started" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const completeSchema = z.object({
  exercises: z.array(z.object({
    exerciseId: z.string(),
    setsCompleted: z.number().optional(),
    repsPerSet: z.array(z.number()).optional(),
    loadKgUsed: z.number().optional(),
  })),
});

router.post("/sessions/:sessionId/complete", authenticate, async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    await db.update(sessionLogsTable)
      .set({ completedAt: new Date() })
      .where(and(
        eq(sessionLogsTable.id, req.params.sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));

    // Log exercises
    for (const ex of parsed.data.exercises) {
      await db.insert(exerciseLogsTable).values({
        sessionLogId: req.params.sessionId,
        exerciseId: ex.exerciseId,
        setsCompleted: ex.setsCompleted,
        repsPerSet: ex.repsPerSet ?? null,
        loadKgUsed: ex.loadKgUsed?.toString() ?? null,
      });
    }

    res.json({ success: true, message: "Session completed" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const feedbackSchema = z.object({
  rpe: z.number().int().min(1).max(10),
  perceivedDifficulty: z.enum(["too_easy", "well_calibrated", "too_hard"]),
  athleteNotes: z.string().nullable().optional(),
});

router.post("/sessions/:sessionId/feedback", authenticate, async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    await db.update(sessionLogsTable)
      .set({
        rpe: parsed.data.rpe,
        perceivedDifficulty: parsed.data.perceivedDifficulty,
        athleteNotes: parsed.data.athleteNotes ?? null,
      })
      .where(and(
        eq(sessionLogsTable.id, req.params.sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));
    res.json({ success: true, message: "Feedback submitted" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/sessions/history", authenticate, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const logs = await db.select().from(sessionLogsTable)
    .where(and(
      eq(sessionLogsTable.athleteId, req.user!.userId),
      gte(sessionLogsTable.createdAt, thirtyDaysAgo)
    ))
    .orderBy(desc(sessionLogsTable.createdAt));
  res.json(logs);
});

export default router;
