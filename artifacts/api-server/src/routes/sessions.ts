import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  checkinsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable,
  exercisesTable, programsTable, sessionLogsTable, exerciseLogsTable, alertsTable,
} from "@workspace/db";
import { eq, and, desc, gte, lt, inArray, isNotNull } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { calculateAdaptedLoad } from "../services/adapt-engine.js";
import { detectNewPRs, getAthleteCurrentPRs } from "../services/prService.js";
import { checkAfterSession, checkAfterFeedback } from "../services/badgeService.js";
import { z } from "zod";

const router = Router();

async function getLastUsedLoads(
  athleteId: string,
  exerciseIds: string[]
): Promise<Record<string, { loadKg: number; date: string }>> {
  if (exerciseIds.length === 0) return {};

  const logs = await db
    .select({
      exerciseId: exerciseLogsTable.exerciseId,
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      createdAt: exerciseLogsTable.createdAt,
    })
    .from(exerciseLogsTable)
    .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
    .where(
      and(
        eq(sessionLogsTable.athleteId, athleteId),
        inArray(exerciseLogsTable.exerciseId, exerciseIds),
        isNotNull(exerciseLogsTable.loadKgUsed)
      )
    )
    .orderBy(desc(exerciseLogsTable.createdAt));

  const result: Record<string, { loadKg: number; date: string }> = {};
  for (const log of logs) {
    if (!result[log.exerciseId] && log.loadKgUsed != null) {
      const parsed = parseFloat(log.loadKgUsed);
      if (!isNaN(parsed) && parsed > 0) {
        result[log.exerciseId] = {
          loadKg: parsed,
          date: log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0]! : "",
        };
      }
    }
  }
  return result;
}

async function buildSessionDetail(
  sessionLog: typeof sessionLogsTable.$inferSelect,
  checkin: typeof checkinsTable.$inferSelect
) {
  let exercises: {
    id: string;
    exerciseId: string;
    exerciseName: string;
    category: string | null;
    imageUrl: string | null;
    gifUrl: string | null;
    muscleGroups: unknown;
    orderIndex: number;
    sets: number;
    reps: string | null;
    nominalLoadKg: number | null;
    adaptedLoadKg: number | null;
    restSeconds: number | null;
    coachCue: string | null;
    lastUsedLoadKg: number | null;
    lastUsedDate: string | null;
  }[] = [];

  if (sessionLog.sessionId) {
    let [variant] = await db.select().from(sessionVariantsTable)
      .where(and(
        eq(sessionVariantsTable.sessionId, sessionLog.sessionId),
        eq(sessionVariantsTable.mode, sessionLog.variantMode)
      ));

    if (!variant) {
      [variant] = await db.select().from(sessionVariantsTable)
        .where(and(
          eq(sessionVariantsTable.sessionId, sessionLog.sessionId),
          eq(sessionVariantsTable.mode, "normal")
        ));
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
        category: exercisesTable.category,
        demoUrl: exercisesTable.demoUrl,
        demoGifUrl: exercisesTable.demoGifUrl,
        muscleGroups: exercisesTable.muscleGroups,
      })
        .from(sessionExercisesTable)
        .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
        .where(eq(sessionExercisesTable.variantId, variant.id))
        .orderBy(sessionExercisesTable.orderIndex);

      const exerciseIds = exs.map(e => e.exerciseId);
      const lastUsed = await getLastUsedLoads(checkin.athleteId, exerciseIds);

      exercises = exs.map(ex => ({
        id: ex.id,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        category: ex.category ?? null,
        imageUrl: ex.demoUrl ?? null,
        gifUrl: ex.demoGifUrl ?? null,
        muscleGroups: ex.muscleGroups,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        reps: ex.reps ?? null,
        nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
        adaptedLoadKg: calculateAdaptedLoad(ex.loadKg ? parseFloat(ex.loadKg) : null, sessionLog.variantMode),
        restSeconds: ex.restSeconds ?? null,
        coachCue: ex.coachCue ?? null,
        lastUsedLoadKg: lastUsed[ex.exerciseId]?.loadKg ?? null,
        lastUsedDate: lastUsed[ex.exerciseId]?.date ?? null,
      }));
    }
  }

  return {
    sessionLogId: sessionLog.id,
    sessionId: sessionLog.sessionId,
    mode: sessionLog.variantMode,
    adaptScore: checkin.adaptScore,
    completedAt: sessionLog.completedAt ?? null,
    exercises,
  };
}

router.get("/sessions/today", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const athleteId = req.user!.userId;

    const [checkin] = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athleteId), eq(checkinsTable.date, today)));

    if (!checkin) {
      res.status(403).json({ error: { code: "SESSION_NOT_UNLOCKED", message: "Complete your check-in first" } });
      return;
    }

    const [existingLog] = await db.select().from(sessionLogsTable)
      .where(and(
        eq(sessionLogsTable.athleteId, athleteId),
        eq(sessionLogsTable.checkinId, checkin.id)
      ));

    if (existingLog) {
      const detail = await buildSessionDetail(existingLog, checkin);
      res.json({ ...detail, name: "Séance du jour", coachNotes: null, overriddenByCoach: false, estimatedDurationMin: null });
      return;
    }

    const painAlerts = await db.select({ id: alertsTable.id }).from(alertsTable)
      .where(and(
        eq(alertsTable.athleteId, athleteId),
        eq(alertsTable.type, "pain"),
        eq(alertsTable.isResolved, false)
      ));

    const forcedMode = painAlerts.length > 0 ? "recovery" : checkin.sessionMode;

    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)));

    let sessionId: string | null = null;
    let sessionName = "Session libre";
    let estimatedDuration: number | null = null;
    let coachNotes: string | null = null;
    let exercises: {
      id: string;
      exerciseId: string;
      exerciseName: string;
      category: string | null;
      imageUrl: string | null;
      gifUrl: string | null;
      muscleGroups: unknown;
      orderIndex: number;
      sets: number;
      reps: string | null;
      nominalLoadKg: number | null;
      adaptedLoadKg: number | null;
      restSeconds: number | null;
      coachCue: string | null;
      lastUsedLoadKg: number | null;
      lastUsedDate: string | null;
    }[] = [];

    if (program) {
      const startDate = program.startDate ? new Date(program.startDate) : new Date();
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / 86400000);
      const trainingWeek = Math.min(
        Math.max(1, Math.floor(daysSinceStart / 7) + 1),
        program.durationWeeks ?? 1
      );

      const dayOfWeek = now.getDay();
      const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
      const dayNum = dayMap[dayOfWeek] ?? 1;

      let [session] = await db.select().from(sessionsTable)
        .where(and(
          eq(sessionsTable.programId, program.id),
          eq(sessionsTable.weekNumber, trainingWeek),
          eq(sessionsTable.dayNumber, dayNum)
        ));

      if (!session) {
        [session] = await db.select().from(sessionsTable)
          .where(and(eq(sessionsTable.programId, program.id), eq(sessionsTable.dayNumber, dayNum)));
      }

      if (session) {
        sessionId = session.id;
        sessionName = session.name;
        estimatedDuration = session.estimatedDurationMin ?? null;
        coachNotes = session.coachNotes ?? null;

        let [variant] = await db.select().from(sessionVariantsTable)
          .where(and(
            eq(sessionVariantsTable.sessionId, session.id),
            eq(sessionVariantsTable.mode, forcedMode)
          ));

        if (!variant) {
          [variant] = await db.select().from(sessionVariantsTable)
            .where(and(
              eq(sessionVariantsTable.sessionId, session.id),
              eq(sessionVariantsTable.mode, "normal")
            ));
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
            category: exercisesTable.category,
            demoUrl: exercisesTable.demoUrl,
            demoGifUrl: exercisesTable.demoGifUrl,
            muscleGroups: exercisesTable.muscleGroups,
          })
            .from(sessionExercisesTable)
            .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
            .where(eq(sessionExercisesTable.variantId, variant.id))
            .orderBy(sessionExercisesTable.orderIndex);

          const exerciseIds = exs.map(e => e.exerciseId);
          const lastUsed = await getLastUsedLoads(athleteId, exerciseIds);

          exercises = exs.map(ex => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            category: ex.category ?? null,
            imageUrl: ex.demoUrl ?? null,
            gifUrl: ex.demoGifUrl ?? null,
            muscleGroups: ex.muscleGroups,
            orderIndex: ex.orderIndex,
            sets: ex.sets,
            reps: ex.reps ?? null,
            nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
            adaptedLoadKg: calculateAdaptedLoad(ex.loadKg ? parseFloat(ex.loadKg) : null, forcedMode),
            restSeconds: ex.restSeconds ?? null,
            coachCue: ex.coachCue ?? null,
            lastUsedLoadKg: lastUsed[ex.exerciseId]?.loadKg ?? null,
            lastUsedDate: lastUsed[ex.exerciseId]?.date ?? null,
          }));
        }
      }
    }

    const [sessionLog] = await db.insert(sessionLogsTable).values({
      athleteId,
      sessionId,
      variantMode: forcedMode,
      checkinId: checkin.id,
    }).returning();

    const athletePRs = await getAthleteCurrentPRs(athleteId);

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
      athletePRs,
      completedAt: null,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/sessions/:sessionId/start", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionId = String(req.params["sessionId"]);
    await db.update(sessionLogsTable)
      .set({ startedAt: new Date() })
      .where(and(
        eq(sessionLogsTable.id, sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));
    res.json({ success: true, message: "Session started" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const completeSchema = z.object({
  rpe: z.number().int().min(1).max(10).optional(),
  perceivedDifficulty: z.enum(["too_easy", "well_calibrated", "too_hard"]).optional(),
  athleteNotes: z.string().nullable().optional(),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    setsCompleted: z.number().int().optional(),
    repsPerSet: z.array(z.number().int()).optional(),
    loadKgUsed: z.number().optional(),
  })).optional().default([]),
});

router.post("/sessions/:sessionId/complete", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const sessionId = String(req.params["sessionId"]);
    const completedAt = new Date();

    const [existingLog] = await db.select({ startedAt: sessionLogsTable.startedAt })
      .from(sessionLogsTable)
      .where(and(
        eq(sessionLogsTable.id, sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));

    const startedAt = existingLog?.startedAt;
    const durationMin = startedAt
      ? Math.max(1, Math.round((completedAt.getTime() - new Date(startedAt).getTime()) / 60000))
      : null;

    await db.update(sessionLogsTable)
      .set({
        completedAt,
        rpe: parsed.data.rpe ?? null,
        perceivedDifficulty: parsed.data.perceivedDifficulty ?? null,
        athleteNotes: parsed.data.athleteNotes ?? null,
      })
      .where(and(
        eq(sessionLogsTable.id, sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ));

    for (const ex of parsed.data.exercises) {
      await db.insert(exerciseLogsTable).values({
        sessionLogId: sessionId,
        exerciseId: ex.exerciseId,
        setsCompleted: ex.setsCompleted ?? null,
        repsPerSet: ex.repsPerSet ?? null,
        loadKgUsed: ex.loadKgUsed != null ? ex.loadKgUsed.toString() : null,
      });
    }

    const [sessionLog] = await db.select({ variantMode: sessionLogsTable.variantMode, athleteId: sessionLogsTable.athleteId })
      .from(sessionLogsTable).where(eq(sessionLogsTable.id, sessionId));

    let newPRs: Awaited<ReturnType<typeof detectNewPRs>> = [];
    let newBadges: Awaited<ReturnType<typeof checkAfterSession>> = [];

    if (sessionLog) {
      newPRs = await detectNewPRs(sessionLog.athleteId, sessionId, parsed.data.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        setsCompleted: ex.setsCompleted,
        repsPerSet: ex.repsPerSet,
        loadKgUsed: ex.loadKgUsed,
      })));
      newBadges = await checkAfterSession(sessionLog.athleteId, sessionLog.variantMode, newPRs.length);
    }

    res.json({ success: true, message: "Session completed", newPRs, newBadges, durationMin });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const feedbackSchema = z.object({
  rpe: z.number().int().min(1).max(10),
  perceivedDifficulty: z.enum(["too_easy", "well_calibrated", "too_hard"]),
  athleteNotes: z.string().nullable().optional(),
});

router.post("/sessions/:sessionId/feedback", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const sessionId = String(req.params["sessionId"]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session log not found" } });
    return;
  }

  try {
    const [updated] = await db.update(sessionLogsTable)
      .set({
        rpe: parsed.data.rpe,
        perceivedDifficulty: parsed.data.perceivedDifficulty,
        athleteNotes: parsed.data.athleteNotes ?? null,
      })
      .where(and(
        eq(sessionLogsTable.id, sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ))
      .returning({ id: sessionLogsTable.id });

    if (!updated) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session log not found" } });
      return;
    }

    const newBadges = await checkAfterFeedback(req.user!.userId);
    res.json({ success: true, message: "Feedback submitted", newBadges });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/sessions/missed", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;

    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)));

    if (!program) {
      res.json({ missed: [] });
      return;
    }

    const now = new Date();
    const missedSessions: Array<{
      date: string;
      sessionId: string;
      sessionName: string;
      estimatedDurationMin: number | null;
    }> = [];

    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - daysAgo);
      const dateStr = targetDate.toISOString().split("T")[0]!;

      const dayOfWeek = targetDate.getDay();
      const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
      const dayNum = dayMap[dayOfWeek] ?? 1;

      const startDate = program.startDate ? new Date(program.startDate) : new Date();
      const daysSinceStart = Math.floor((targetDate.getTime() - startDate.getTime()) / 86400000);
      const trainingWeek = Math.min(Math.max(1, Math.floor(daysSinceStart / 7) + 1), program.durationWeeks ?? 1);

      let [session] = await db.select().from(sessionsTable)
        .where(and(
          eq(sessionsTable.programId, program.id),
          eq(sessionsTable.weekNumber, trainingWeek),
          eq(sessionsTable.dayNumber, dayNum)
        ));

      if (!session) {
        [session] = await db.select().from(sessionsTable)
          .where(and(eq(sessionsTable.programId, program.id), eq(sessionsTable.dayNumber, dayNum)));
      }

      if (!session) continue;

      const dayStart = new Date(dateStr + "T00:00:00.000Z");
      const dayEnd = new Date(dateStr + "T23:59:59.999Z");

      const completedLogs = await db.select({ id: sessionLogsTable.id })
        .from(sessionLogsTable)
        .where(and(
          eq(sessionLogsTable.athleteId, athleteId),
          eq(sessionLogsTable.sessionId, session.id),
          gte(sessionLogsTable.createdAt, dayStart),
          lt(sessionLogsTable.createdAt, dayEnd),
          isNotNull(sessionLogsTable.completedAt)
        ));

      if (completedLogs.length === 0) {
        missedSessions.push({
          date: dateStr,
          sessionId: session.id,
          sessionName: session.name,
          estimatedDurationMin: session.estimatedDurationMin ?? null,
        });
      }
    }

    res.json({ missed: missedSessions });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/sessions/history", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const logs = await db
      .select({
        id: sessionLogsTable.id,
        sessionId: sessionLogsTable.sessionId,
        variantMode: sessionLogsTable.variantMode,
        rpe: sessionLogsTable.rpe,
        perceivedDifficulty: sessionLogsTable.perceivedDifficulty,
        athleteNotes: sessionLogsTable.athleteNotes,
        startedAt: sessionLogsTable.startedAt,
        completedAt: sessionLogsTable.completedAt,
        createdAt: sessionLogsTable.createdAt,
        sessionName: sessionsTable.name,
      })
      .from(sessionLogsTable)
      .leftJoin(sessionsTable, eq(sessionLogsTable.sessionId, sessionsTable.id))
      .where(and(
        eq(sessionLogsTable.athleteId, req.user!.userId),
        gte(sessionLogsTable.createdAt, thirtyDaysAgo)
      ))
      .orderBy(desc(sessionLogsTable.createdAt));

    const enriched = await Promise.all(
      logs.map(async (log) => {
        const exerciseLogs = await db
          .select({
            exerciseId: exerciseLogsTable.exerciseId,
            loadKgUsed: exerciseLogsTable.loadKgUsed,
            setsCompleted: exerciseLogsTable.setsCompleted,
            exerciseName: exercisesTable.name,
          })
          .from(exerciseLogsTable)
          .leftJoin(exercisesTable, eq(exerciseLogsTable.exerciseId, exercisesTable.id))
          .where(eq(exerciseLogsTable.sessionLogId, log.id));

        const durationMin =
          log.startedAt && log.completedAt
            ? Math.max(1, Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 60000))
            : null;

        return {
          id: log.id,
          sessionId: log.sessionId,
          sessionName: log.sessionName ?? "Session libre",
          variantMode: log.variantMode,
          rpe: log.rpe,
          perceivedDifficulty: log.perceivedDifficulty,
          athleteNotes: log.athleteNotes,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          createdAt: log.createdAt,
          durationMin,
          exercises: exerciseLogs.map(e => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName ?? "",
            loadKgUsed: e.loadKgUsed ? parseFloat(e.loadKgUsed) : null,
            setsCompleted: e.setsCompleted,
          })),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
