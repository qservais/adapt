import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  checkinsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable,
  exercisesTable, programsTable, sessionLogsTable, exerciseLogsTable, alertsTable,
  performanceTestsTable, coachAppointmentsTable, contentRoutinesTable,
  sessionBlocksTable, athleteExercisePreferencesTable,
} from "@workspace/db";
import { eq, and, desc, asc, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { calculateAdaptedLoad } from "../services/adapt-engine.js";
import { detectNewPRs, getAthleteCurrentPRs } from "../services/prService.js";
import { checkAfterSession, checkAfterFeedback } from "../services/badgeService.js";
import { z } from "zod";
import { getTodayLocalDate, localDateFromTimestamp, getLocalDayNumber, dateDiffDays, computeSessionDate } from "../lib/dateUtils.js";

const router = Router();

async function getLastUsedLoads(
  athleteId: string,
  exerciseIds: string[]
): Promise<Record<string, { loadKg: number; date: string; repsPerSet: number[] }>> {
  if (exerciseIds.length === 0) return {};

  const logs = await db
    .select({
      exerciseId: exerciseLogsTable.exerciseId,
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      repsPerSet: exerciseLogsTable.repsPerSet,
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

  const result: Record<string, { loadKg: number; date: string; repsPerSet: number[] }> = {};
  for (const log of logs) {
    if (!result[log.exerciseId] && log.loadKgUsed != null) {
      const parsed = parseFloat(log.loadKgUsed);
      if (!isNaN(parsed) && parsed > 0) {
        result[log.exerciseId] = {
          loadKg: parsed,
          date: log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0]! : "",
          repsPerSet: Array.isArray(log.repsPerSet) ? (log.repsPerSet as number[]) : [],
        };
      }
    }
  }
  return result;
}

interface CheckinContext {
  id: string;
  athleteId: string;
  date: string;
  adaptScore: number;
  sessionMode: string;
  sleep?: number | null;
  energy?: number | null;
  stress?: number | null;
  soreness?: number | null;
  motivation?: number | null;
  hasPain?: boolean | null;
  painNotes?: string | null;
  cyclePhase?: string | null;
  createdAt?: Date | null;
}

async function buildSessionDetail(
  sessionLog: typeof sessionLogsTable.$inferSelect,
  checkin: CheckinContext
) {
  let sessionName = "Séance du jour";
  let coachNotes: string | null = null;
  let estimatedDurationMin: number | null = null;
  let sessionType: string | null = null;
  let sessionLocation: string | null = null;
  let scheduledTime: string | null = null;
  let visioLink: string | null = null;

  if (sessionLog.sessionId) {
    const [sess] = await db.select({
      name: sessionsTable.name,
      coachNotes: sessionsTable.coachNotes,
      estimatedDurationMin: sessionsTable.estimatedDurationMin,
      type: sessionsTable.type,
      sessionType: sessionsTable.sessionType,
      scheduledTime: sessionsTable.scheduledTime,
      visioLink: sessionsTable.visioLink,
    }).from(sessionsTable).where(eq(sessionsTable.id, sessionLog.sessionId));
    if (sess) {
      sessionName = sess.name;
      coachNotes = sess.coachNotes ?? null;
      estimatedDurationMin = sess.estimatedDurationMin ?? null;
      sessionType = sess.type ?? null;
      sessionLocation = sess.sessionType ?? "presentiel";
      scheduledTime = sess.scheduledTime ?? null;
      visioLink = sess.visioLink ?? null;
    }
  }

  const durationMin =
    sessionLog.startedAt && sessionLog.completedAt
      ? Math.max(1, Math.round(
          (new Date(sessionLog.completedAt).getTime() - new Date(sessionLog.startedAt).getTime()) / 60000
        ))
      : null;

  let exercises: {
    id: string;
    exerciseId: string;
    exerciseName: string;
    category: string | null;
    imageUrl: string | null;
    gifUrl: string | null;
    muscleGroups: unknown;
    equipment: unknown;
    description: string | null;
    demoUrl: string | null;
    orderIndex: number;
    sets: number;
    reps: string | null;
    nominalLoadKg: number | null;
    adaptedLoadKg: number | null;
    restSeconds: number | null;
    durationSeconds: number | null;
    coachCue: string | null;
    tempo: string | null;
    lastUsedLoadKg: number | null;
    lastUsedDate: string | null;
    lastUsedRepsPerSet: number[] | null;
    blockId: string | null;
  }[] = [];

  let blocks: {
    id: string;
    type: string;
    orderIndex: number;
    name: string | null;
    notes: string | null;
    estimatedDurationMin: number | null;
  }[] = [];

  if (sessionLog.sessionId) {
    const [rawBlocks, variant] = await Promise.all([
      db.select({
        id: sessionBlocksTable.id,
        type: sessionBlocksTable.type,
        orderIndex: sessionBlocksTable.orderIndex,
        name: sessionBlocksTable.name,
        notes: sessionBlocksTable.notes,
        estimatedDurationMin: sessionBlocksTable.estimatedDurationMin,
      })
        .from(sessionBlocksTable)
        .where(eq(sessionBlocksTable.sessionId, sessionLog.sessionId))
        .orderBy(asc(sessionBlocksTable.orderIndex)),
      db.select().from(sessionVariantsTable)
        .where(and(
          eq(sessionVariantsTable.sessionId, sessionLog.sessionId),
          eq(sessionVariantsTable.mode, sessionLog.variantMode)
        ))
        .then(async rows => {
          if (rows[0]) return rows[0];
          const fallback = await db.select().from(sessionVariantsTable)
            .where(and(
              eq(sessionVariantsTable.sessionId, sessionLog.sessionId!),
              eq(sessionVariantsTable.mode, "normal")
            ));
          return fallback[0] ?? null;
        }),
    ]);

    blocks = rawBlocks;

    if (variant) {
      const exs = await db.select({
        id: sessionExercisesTable.id,
        exerciseId: sessionExercisesTable.exerciseId,
        blockId: sessionExercisesTable.blockId,
        orderIndex: sessionExercisesTable.orderIndex,
        sets: sessionExercisesTable.sets,
        reps: sessionExercisesTable.reps,
        loadKg: sessionExercisesTable.loadKg,
        restSeconds: sessionExercisesTable.restSeconds,
        durationSeconds: sessionExercisesTable.durationSeconds,
        coachCue: sessionExercisesTable.coachCue,
        tempo: sessionExercisesTable.tempo,
        exerciseName: exercisesTable.name,
        category: exercisesTable.category,
        demoUrl: exercisesTable.demoUrl,
        demoGifUrl: exercisesTable.demoGifUrl,
        muscleGroups: exercisesTable.muscleGroups,
        equipment: exercisesTable.equipment,
        description: exercisesTable.description,
      })
        .from(sessionExercisesTable)
        .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
        .leftJoin(sessionBlocksTable, eq(sessionExercisesTable.blockId, sessionBlocksTable.id))
        .where(eq(sessionExercisesTable.variantId, variant.id))
        .orderBy(
          sql`COALESCE(${sessionBlocksTable.orderIndex}, 9999)`,
          asc(sessionExercisesTable.orderIndex)
        );

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
        equipment: ex.equipment,
        description: ex.description ?? null,
        demoUrl: ex.demoUrl ?? null,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        reps: ex.reps ?? null,
        nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
        adaptedLoadKg: calculateAdaptedLoad(ex.loadKg ? parseFloat(ex.loadKg) : null, sessionLog.variantMode),
        restSeconds: ex.restSeconds ?? null,
        durationSeconds: ex.durationSeconds ?? null,
        coachCue: ex.coachCue ?? null,
        tempo: ex.tempo ?? null,
        lastUsedLoadKg: lastUsed[ex.exerciseId]?.loadKg ?? null,
        lastUsedDate: lastUsed[ex.exerciseId]?.date ?? null,
        lastUsedRepsPerSet: lastUsed[ex.exerciseId]?.repsPerSet ?? null,
        blockId: ex.blockId ?? null,
      }));
    }
  }

  return {
    sessionLogId: sessionLog.id,
    sessionId: sessionLog.sessionId,
    name: sessionName,
    mode: sessionLog.variantMode,
    sessionType,
    sessionLocation,
    scheduledTime,
    visioLink,
    adaptScore: checkin.adaptScore,
    completedAt: sessionLog.completedAt ?? null,
    durationMin,
    coachNotes,
    estimatedDurationMin,
    overriddenByCoach: false,
    exercises,
    blocks,
    rpe: sessionLog.rpe ?? null,
    perceivedDifficulty: sessionLog.perceivedDifficulty ?? null,
  };
}

async function getTodaySessionsForProgram(
  program: typeof programsTable.$inferSelect
): Promise<typeof sessionsTable.$inferSelect[]> {
  const todayStr = getTodayLocalDate();
  const startDateStr = program.startDate ?? todayStr;
  const dayNum = getLocalDayNumber(todayStr);

  // Fetch all sessions then filter by canonical scheduled date to stay
  // consistent with computeSessionDate used in the upcoming-sessions endpoint.
  const allSessions = await db.select().from(sessionsTable)
    .where(eq(sessionsTable.programId, program.id))
    .orderBy(asc(sessionsTable.createdAt));

  // Primary: sessions whose computed scheduled date is exactly today.
  // Guard: skip sessions projected before programStart (can happen with non-Monday starts).
  const exactMatches = allSessions.filter((s) => {
    const scheduled = computeSessionDate(startDateStr, s.weekNumber, s.dayNumber);
    return scheduled === todayStr && scheduled >= startDateStr;
  });
  if (exactMatches.length > 0) return exactMatches;

  // Fallback: any session scheduled on today's day-of-week (any week),
  // but only if today is on or after programStart.
  if (todayStr < startDateStr) return [];
  return allSessions.filter((s) => s.dayNumber === dayNum);
}

async function getOrCreateTodaySessionLogs(
  athleteId: string,
  checkin: typeof checkinsTable.$inferSelect,
  forcedMode: string,
  program: typeof programsTable.$inferSelect | null
): Promise<{ logs: typeof sessionLogsTable.$inferSelect[]; total: number; completed: number }> {
  const existingLogs = await db.select().from(sessionLogsTable)
    .where(and(
      eq(sessionLogsTable.athleteId, athleteId),
      eq(sessionLogsTable.checkinId, checkin.id)
    ))
    .orderBy(asc(sessionLogsTable.createdAt));

  if (!program) {
    // Don't auto-create an empty log for athletes without a program.
    // Return completed logs + at most the most recent incomplete log (avoids orphan accumulation).
    const completedLogs = existingLogs.filter(l => l.completedAt != null);
    const incompleteLogs = existingLogs.filter(l => l.completedAt == null);
    const mostRecentIncomplete = incompleteLogs.length > 0 ? [incompleteLogs[incompleteLogs.length - 1]!] : [];
    const relevantLogs = [...completedLogs, ...mostRecentIncomplete];
    const completed = completedLogs.length;
    return { logs: relevantLogs, total: relevantLogs.length, completed };
  }

  const todaySessions = await getTodaySessionsForProgram(program);

  if (todaySessions.length === 0) {
    const freeLog = existingLogs.find(l => l.sessionId === null);
    if (freeLog) {
      const completed = existingLogs.filter(l => l.completedAt != null).length;
      return { logs: [freeLog], total: 1, completed };
    }
    const [newLog] = await db.insert(sessionLogsTable).values({
      athleteId, sessionId: null, variantMode: forcedMode, checkinId: checkin.id,
    }).returning();
    return { logs: [newLog!], total: 1, completed: 0 };
  }

  const logBySessionId = new Map<string, typeof sessionLogsTable.$inferSelect>();
  for (const log of existingLogs) {
    if (log.sessionId) logBySessionId.set(log.sessionId, log);
  }

  const allLogs: typeof sessionLogsTable.$inferSelect[] = [];
  for (const session of todaySessions) {
    let log = logBySessionId.get(session.id);
    if (!log) {
      const [newLog] = await db.insert(sessionLogsTable).values({
        athleteId, sessionId: session.id, variantMode: forcedMode, checkinId: checkin.id,
      }).returning();
      log = newLog!;
    }
    allLogs.push(log);
  }

  const completed = allLogs.filter(l => l.completedAt != null).length;
  return { logs: allLogs, total: allLogs.length, completed };
}

router.get("/sessions/today", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const today = getTodayLocalDate();
    const athleteId = req.user!.userId;

    const [checkin] = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athleteId), eq(checkinsTable.date, today)));

    if (!checkin) {
      res.status(403).json({ error: { code: "SESSION_NOT_UNLOCKED", message: "Complete your check-in first" } });
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

    const { logs, total, completed } = await getOrCreateTodaySessionLogs(
      athleteId, checkin, forcedMode, program ?? null
    );

    if (logs.length === 0) {
      res.status(404).json({ error: { code: "NO_SESSION_TODAY", message: "No session scheduled for today" } });
      return;
    }

    const uncompletedLogs = logs.filter(l => l.completedAt == null);
    const activeLog = uncompletedLogs[0] ?? logs[logs.length - 1]!;
    const sessionIndex = logs.indexOf(activeLog) + 1;

    const detail = await buildSessionDetail(activeLog, checkin);
    const athletePRs = await getAthleteCurrentPRs(athleteId);

    res.json({
      ...detail,
      athletePRs,
      overriddenByCoach: painAlerts.length > 0,
      sessionsToday: total,
      sessionsTodayCompleted: completed,
      sessionIndex,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/sessions/today-all", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const today = getTodayLocalDate();
    const athleteId = req.user!.userId;

    const [checkin] = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athleteId), eq(checkinsTable.date, today)));

    if (!checkin) {
      res.json([]);
      return;
    }

    const painAlerts = await db.select({ id: alertsTable.id }).from(alertsTable)
      .where(and(
        eq(alertsTable.athleteId, athleteId),
        eq(alertsTable.type, "pain"),
        eq(alertsTable.isResolved, false)
      ));
    const overriddenByCoach = painAlerts.length > 0;
    const forcedMode = overriddenByCoach ? "recovery" : checkin.sessionMode;

    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)));

    const { logs, total, completed } = await getOrCreateTodaySessionLogs(
      athleteId, checkin, forcedMode, program ?? null
    );

    const athletePRs = await getAthleteCurrentPRs(athleteId);

    const details = await Promise.all(
      logs.map(async (log, i) => {
        const detail = await buildSessionDetail(log, checkin);
        return {
          ...detail,
          athletePRs,
          overriddenByCoach,
          sessionsToday: total,
          sessionsTodayCompleted: completed,
          sessionIndex: i + 1,
        };
      })
    );

    res.json(details);
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

router.delete("/sessions/:sessionLogId", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionLogId = String(req.params["sessionLogId"]);
    const athleteId = req.user!.userId;

    const [log] = await db.select().from(sessionLogsTable)
      .where(and(
        eq(sessionLogsTable.id, sessionLogId),
        eq(sessionLogsTable.athleteId, athleteId)
      ));

    if (!log) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session log not found" } });
      return;
    }

    if (log.completedAt != null) {
      res.status(400).json({ error: { code: "ALREADY_COMPLETED", message: "Cannot cancel a completed session" } });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(exerciseLogsTable).where(eq(exerciseLogsTable.sessionLogId, sessionLogId));
      await tx.delete(sessionLogsTable).where(eq(sessionLogsTable.id, sessionLogId));
    });

    res.json({ success: true });
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
      const prefReps = ex.repsPerSet != null && ex.repsPerSet.length > 0
        ? String(ex.repsPerSet[0])
        : null;
      await db.insert(athleteExercisePreferencesTable).values({
        athleteId: req.user!.userId,
        exerciseId: ex.exerciseId,
        preferredSets: ex.setsCompleted ?? null,
        preferredReps: prefReps,
        preferredLoadKg: ex.loadKgUsed != null ? ex.loadKgUsed.toString() : null,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [athleteExercisePreferencesTable.athleteId, athleteExercisePreferencesTable.exerciseId],
        set: {
          preferredSets: ex.setsCompleted ?? null,
          preferredReps: prefReps,
          preferredLoadKg: ex.loadKgUsed != null ? ex.loadKgUsed.toString() : null,
          updatedAt: sql`now()`,
        },
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
  theme: z.string().max(30).nullable().optional(),
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
    const [existing] = await db.select({
      id: sessionLogsTable.id,
      completedAt: sessionLogsTable.completedAt,
    }).from(sessionLogsTable).where(and(
      eq(sessionLogsTable.id, sessionId),
      eq(sessionLogsTable.athleteId, req.user!.userId)
    ));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session log introuvable" } });
      return;
    }
    if (!existing.completedAt) {
      res.status(422).json({ error: { code: "SESSION_NOT_COMPLETED", message: "Cette séance n'est pas encore terminée" } });
      return;
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (new Date(existing.completedAt) < sevenDaysAgo) {
      res.status(422).json({ error: { code: "RPE_WINDOW_CLOSED", message: "Le délai pour évaluer cette séance est dépassé (7 jours max)" } });
      return;
    }

    const [updated] = await db.update(sessionLogsTable)
      .set({
        rpe: parsed.data.rpe,
        perceivedDifficulty: parsed.data.perceivedDifficulty,
        athleteNotes: parsed.data.athleteNotes ?? null,
        theme: parsed.data.theme ?? null,
      })
      .where(and(
        eq(sessionLogsTable.id, sessionId),
        eq(sessionLogsTable.athleteId, req.user!.userId)
      ))
      .returning({ id: sessionLogsTable.id });

    if (!updated) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session log introuvable" } });
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

    const todayStr = getTodayLocalDate();
    const missedSessions: Array<{
      date: string;
      sessionId: string;
      sessionName: string;
      estimatedDurationMin: number | null;
    }> = [];

    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const targetMs = new Date(todayStr + "T12:00:00Z").getTime() - daysAgo * 86400000;
      const dateStr = new Date(targetMs).toISOString().split("T")[0]!;

      const dayNum = getLocalDayNumber(dateStr);
      const startDateStr = program.startDate ?? todayStr;
      const diff = dateDiffDays(startDateStr, dateStr);
      const trainingWeek = Math.min(Math.max(1, Math.floor(diff / 7) + 1), program.durationWeeks ?? 1);

      let sessions = await db.select().from(sessionsTable)
        .where(and(
          eq(sessionsTable.programId, program.id),
          eq(sessionsTable.weekNumber, trainingWeek),
          eq(sessionsTable.dayNumber, dayNum)
        ));

      if (sessions.length === 0) {
        sessions = await db.select().from(sessionsTable)
          .where(and(eq(sessionsTable.programId, program.id), eq(sessionsTable.dayNumber, dayNum)));
      }

      const [checkinForDay] = await db.select({ id: checkinsTable.id })
        .from(checkinsTable)
        .where(and(
          eq(checkinsTable.athleteId, athleteId),
          eq(checkinsTable.date, dateStr)
        ));

      for (const session of sessions) {
        if (!checkinForDay) {
          missedSessions.push({
            date: dateStr,
            sessionId: session.id,
            sessionName: session.name,
            estimatedDurationMin: session.estimatedDurationMin ?? null,
          });
          continue;
        }

        const [completedLog] = await db.select({ id: sessionLogsTable.id })
          .from(sessionLogsTable)
          .where(and(
            eq(sessionLogsTable.athleteId, athleteId),
            eq(sessionLogsTable.sessionId, session.id),
            eq(sessionLogsTable.checkinId, checkinForDay.id),
            isNotNull(sessionLogsTable.completedAt)
          ));

        if (!completedLog) {
          missedSessions.push({
            date: dateStr,
            sessionId: session.id,
            sessionName: session.name,
            estimatedDurationMin: session.estimatedDurationMin ?? null,
          });
        }
      }
    }

    res.json({ missed: missedSessions });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/upcoming-sessions", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const [activeProgram] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)))
      .limit(1);

    if (!activeProgram?.startDate) {
      res.json([]);
      return;
    }

    const programStart = new Date(activeProgram.startDate);
    const programEnd = new Date(programStart);
    programEnd.setDate(programStart.getDate() + activeProgram.durationWeeks * 7);

    const todayStr = getTodayLocalDate();
    const isProgramInPreview = (activeProgram.previewEnabled ?? false) && activeProgram.startDate > todayStr;

    const today = new Date(`${todayStr}T00:00:00Z`);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const minus3Days = new Date(today);
    minus3Days.setDate(today.getDate() - 3);

    const plannedSessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, activeProgram.id));

    const allLogs = await db.select({ sessionId: sessionLogsTable.sessionId, completedAt: sessionLogsTable.completedAt })
      .from(sessionLogsTable)
      .where(and(eq(sessionLogsTable.athleteId, athleteId), isNotNull(sessionLogsTable.completedAt)));

    const completedMap = new Map<string, string>();
    for (const log of allLogs) {
      if (log.sessionId && log.completedAt) {
        const existing = completedMap.get(log.sessionId);
        const logDate = new Date(log.completedAt).toISOString().split("T")[0]!;
        if (!existing || logDate > existing) completedMap.set(log.sessionId, logDate);
      }
    }

    const result = [];
    for (const session of plannedSessions) {
      const scheduledDateStr = computeSessionDate(activeProgram.startDate, session.weekNumber, session.dayNumber);
      const sessionDate = new Date(`${scheduledDateStr}T00:00:00Z`);

      const isCompleted = completedMap.has(session.id);
      const completedActualDate = completedMap.get(session.id) ?? null;

      if (sessionDate >= programStart && sessionDate >= minus3Days && sessionDate <= in7Days && sessionDate <= programEnd) {
        result.push({
          sessionId: session.id,
          sessionName: session.name,
          sessionType: session.type,
          sessionLocation: session.sessionType ?? "presentiel",
          weekNumber: session.weekNumber,
          dayNumber: session.dayNumber,
          scheduledDate: scheduledDateStr,
          estimatedDurationMin: session.estimatedDurationMin,
          isCompleted,
          completedActualDate,
          scheduledTime: session.scheduledTime ?? null,
          visioLink: session.visioLink ?? null,
          isAppointment: false,
          isPreview: isProgramInPreview,
        });
      }
    }

    result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    const appts = await db.select().from(coachAppointmentsTable)
      .where(and(
        eq(coachAppointmentsTable.athleteId, athleteId),
        gte(coachAppointmentsTable.startAt, today),
      ));

    for (const appt of appts) {
      const apptScheduledDate = localDateFromTimestamp(new Date(appt.startAt));
      const apptDateMidnight = new Date(`${apptScheduledDate}T00:00:00Z`);
      if (apptDateMidnight <= in7Days) {
        result.push({
          sessionId: appt.id,
          sessionName: appt.location ? `RDV — ${appt.location}` : "RDV Présentiel",
          sessionType: "presentiel",
          sessionLocation: "presentiel",
          weekNumber: 0,
          dayNumber: 0,
          scheduledDate: apptScheduledDate,
          estimatedDurationMin: appt.durationMin,
          isCompleted: false,
          completedActualDate: null,
          isAppointment: true,
        });
      }
    }

    result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    res.json(result);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/library-sessions", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const [activeProgram] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)))
      .limit(1);

    if (!activeProgram) {
      res.json([]);
      return;
    }

    const allSessions = await db.select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      type: sessionsTable.type,
      weekNumber: sessionsTable.weekNumber,
      dayNumber: sessionsTable.dayNumber,
      estimatedDurationMin: sessionsTable.estimatedDurationMin,
      sessionType: sessionsTable.sessionType,
    }).from(sessionsTable)
      .where(eq(sessionsTable.programId, activeProgram.id))
      .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

    res.json(allSessions.map(s => ({
      sessionId: s.id,
      sessionName: s.name,
      sessionType: s.type,
      sessionLocation: s.sessionType ?? "presentiel",
      weekNumber: s.weekNumber,
      dayNumber: s.dayNumber,
      estimatedDurationMin: s.estimatedDurationMin,
    })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/tests", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const tests = await db.select().from(performanceTestsTable)
      .where(eq(performanceTestsTable.athleteId, athleteId))
      .orderBy(desc(performanceTestsTable.testedAt));
    res.json(tests.map((t) => ({ ...t, value: parseFloat(String(t.value)) })));
  } catch {
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
        isFreeSession: sessionLogsTable.isFreeSession,
        freeSessionName: sessionLogsTable.freeSessionName,
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

        const blocks = log.sessionId
          ? await db
              .select({
                id: sessionBlocksTable.id,
                type: sessionBlocksTable.type,
                name: sessionBlocksTable.name,
                orderIndex: sessionBlocksTable.orderIndex,
              })
              .from(sessionBlocksTable)
              .where(eq(sessionBlocksTable.sessionId, log.sessionId))
              .orderBy(asc(sessionBlocksTable.orderIndex))
          : [];

        const blockMap = new Map(blocks.map(b => [b.id, b]));

        const sessionExercises = log.sessionId
          ? await db
              .select({
                exerciseId: sessionExercisesTable.exerciseId,
                blockId: sessionExercisesTable.blockId,
              })
              .from(sessionExercisesTable)
              .where(eq(sessionExercisesTable.sessionId, log.sessionId))
          : [];

        const exerciseBlockMap = new Map<string, string | null>();
        for (const se of sessionExercises) {
          if (!exerciseBlockMap.has(se.exerciseId)) {
            exerciseBlockMap.set(se.exerciseId, se.blockId ?? null);
          }
        }

        const durationMin =
          log.startedAt && log.completedAt
            ? Math.max(1, Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 60000))
            : null;

        const isFree = log.isFreeSession ?? false;
        const displayName = isFree
          ? (log.freeSessionName ?? log.sessionName ?? "Séance libre")
          : (log.sessionName ?? "Séance libre");

        return {
          id: log.id,
          sessionId: log.sessionId,
          sessionName: displayName,
          isFreeSession: isFree,
          variantMode: log.variantMode,
          rpe: log.rpe,
          perceivedDifficulty: log.perceivedDifficulty,
          athleteNotes: log.athleteNotes,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          createdAt: log.createdAt,
          durationMin,
          blocks: blocks.map(b => ({
            id: b.id,
            type: b.type,
            name: b.name ?? null,
            orderIndex: b.orderIndex,
          })),
          exercises: exerciseLogs.map(e => {
            const blockId = e.exerciseId ? exerciseBlockMap.get(e.exerciseId) ?? null : null;
            const block = blockId ? blockMap.get(blockId) : undefined;
            return {
              exerciseId: e.exerciseId,
              exerciseName: e.exerciseName ?? "",
              loadKgUsed: e.loadKgUsed ? parseFloat(e.loadKgUsed) : null,
              setsCompleted: e.setsCompleted,
              blockId,
              blockType: block?.type ?? null,
              blockName: block?.name ?? null,
              blockOrderIndex: block?.orderIndex ?? null,
            };
          }),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/sessions/:sessionId/start-free", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionId = String(req.params["sessionId"]);
    const athleteId = req.user!.userId;
    const today = getTodayLocalDate();

    const [session] = await db
      .select({ id: sessionsTable.id, name: sessionsTable.name, programId: sessionsTable.programId })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));

    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Séance introuvable" } });
      return;
    }

    const [athleteProgram] = await db
      .select({ id: programsTable.id })
      .from(programsTable)
      .where(and(
        eq(programsTable.id, session.programId),
        eq(programsTable.athleteId, athleteId)
      ));

    if (!athleteProgram) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Vous n'avez pas accès à cette séance" } });
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

    const [newLog] = await db.insert(sessionLogsTable).values({
      athleteId,
      sessionId: session.id,
      variantMode,
      checkinId: todayCheckin?.id ?? null,
      isFreeSession: true,
      freeSessionName: null,
    }).returning();

    const athletePRs = await getAthleteCurrentPRs(athleteId);

    const fakeCheckin = todayCheckin ?? {
      id: "",
      athleteId,
      date: today,
      adaptScore: 50,
      sessionMode: "normal",
      sleep: null,
      energy: null,
      stress: null,
      soreness: null,
      motivation: null,
      hasPain: false,
      painNotes: null,
      cyclePhase: null,
      createdAt: new Date(),
    };

    const detail = await buildSessionDetail(newLog!, fakeCheckin);

    res.status(201).json({
      ...detail,
      athletePRs,
      isFreeSession: true,
      overriddenByCoach: false,
      sessionsToday: 1,
      sessionsTodayCompleted: 0,
      sessionIndex: 1,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/routines/:routineId/start-free", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const routineId = String(req.params["routineId"]);
    const athleteId = req.user!.userId;
    const today = getTodayLocalDate();

    const [routine] = await db.select().from(contentRoutinesTable)
      .where(eq(contentRoutinesTable.id, routineId));

    if (!routine) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine introuvable" } });
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

    const [newLog] = await db.insert(sessionLogsTable).values({
      athleteId,
      sessionId: null,
      variantMode,
      checkinId: todayCheckin?.id ?? null,
      isFreeSession: true,
      freeSessionName: routine.title,
    }).returning();

    const routineExercises = (routine.exercises as Array<{ name: string; sets?: string; notes?: string }> | null) ?? [];
    const exerciseCount = routineExercises.length;

    res.status(201).json({
      sessionLogId: newLog!.id,
      sessionId: null,
      name: routine.title,
      mode: variantMode,
      isFreeSession: true,
      isRoutine: true,
      routineId: routine.id,
      adaptScore: todayCheckin?.adaptScore ?? 50,
      completedAt: null,
      durationMin: null,
      coachNotes: routine.description ?? null,
      estimatedDurationMin: routine.durationMin ?? null,
      overriddenByCoach: false,
      exercises: routineExercises.map((ex, i) => ({
        id: `routine-ex-${i}`,
        exerciseId: `routine-ex-${i}`,
        exerciseName: ex.name,
        category: null,
        imageUrl: null,
        gifUrl: null,
        muscleGroups: [],
        equipment: [],
        description: ex.notes ?? null,
        demoUrl: null,
        orderIndex: i,
        sets: ex.sets ? parseInt(ex.sets) || 3 : 3,
        reps: ex.sets ?? "10",
        nominalLoadKg: null,
        adaptedLoadKg: null,
        restSeconds: 60,
        durationSeconds: null,
        coachCue: ex.notes ?? null,
        tempo: null,
        lastUsedLoadKg: null,
        lastUsedDate: null,
      })),
      sessionsToday: 1,
      sessionsTodayCompleted: 0,
      sessionIndex: 1,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/sessions/free-custom", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const today = getTodayLocalDate();

    const bodySchema = z.object({
      name: z.string().min(1).max(100).optional(),
      exercises: z.array(z.object({
        exerciseId: z.string().uuid(),
        exerciseName: z.string().min(1).optional(),
        sets: z.number().int().min(1).max(20),
        reps: z.string().min(1).max(20),
        loadKg: z.number().nonnegative().nullable().optional(),
        restSeconds: z.number().int().min(0).max(600).optional(),
      })).min(1).max(30),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }

    const { name = "Séance personnalisée", exercises: exerciseList } = parsed.data;

    const exerciseIds = exerciseList.map(e => e.exerciseId);

    const dbExercises = exerciseIds.length > 0
      ? await db.select({
          id: exercisesTable.id,
          name: exercisesTable.name,
          category: exercisesTable.category,
          muscleGroups: exercisesTable.muscleGroups,
          equipment: exercisesTable.equipment,
          description: exercisesTable.description,
          demoUrl: exercisesTable.demoUrl,
          demoGifUrl: exercisesTable.demoGifUrl,
        }).from(exercisesTable).where(inArray(exercisesTable.id, exerciseIds))
      : [];

    const exerciseMap = new Map(dbExercises.map(e => [e.id, e]));

    const unknownIds = exerciseIds.filter(id => !exerciseMap.has(id));
    if (unknownIds.length > 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: `Exercices introuvables: ${unknownIds.join(", ")}` } });
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

    const [newLog] = await db.insert(sessionLogsTable).values({
      athleteId,
      sessionId: null,
      variantMode,
      checkinId: todayCheckin?.id ?? null,
      isFreeSession: true,
      freeSessionName: name,
    }).returning();

    const lastUsed = await getLastUsedLoads(athleteId, exerciseIds);

    const athletePRs = await getAthleteCurrentPRs(athleteId);

    const exercises = exerciseList.map((ex, i) => {
      const dbEx = exerciseMap.get(ex.exerciseId)!;
      return {
        id: `custom-ex-${i}`,
        exerciseId: ex.exerciseId,
        exerciseName: dbEx.name,
        category: dbEx.category ?? null,
        imageUrl: dbEx.demoUrl ?? null,
        gifUrl: dbEx.demoGifUrl ?? null,
        muscleGroups: dbEx.muscleGroups ?? [],
        equipment: dbEx.equipment ?? [],
        description: dbEx.description ?? null,
        demoUrl: dbEx.demoUrl ?? null,
        orderIndex: i,
        sets: ex.sets,
        reps: ex.reps,
        nominalLoadKg: ex.loadKg ?? null,
        adaptedLoadKg: ex.loadKg ?? null,
        restSeconds: ex.restSeconds ?? 60,
        durationSeconds: null,
        coachCue: null,
        tempo: null,
        lastUsedLoadKg: lastUsed[ex.exerciseId]?.loadKg ?? null,
        lastUsedDate: lastUsed[ex.exerciseId]?.date ?? null,
      };
    });

    res.status(201).json({
      sessionLogId: newLog!.id,
      sessionId: null,
      name,
      mode: variantMode,
      isFreeSession: true,
      isRoutine: false,
      routineId: null,
      adaptScore: todayCheckin?.adaptScore ?? 50,
      completedAt: null,
      durationMin: null,
      coachNotes: null,
      estimatedDurationMin: null,
      overriddenByCoach: false,
      exercises,
      athletePRs,
      sessionsToday: 1,
      sessionsTodayCompleted: 0,
      sessionIndex: 1,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/programs", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const todayStr = getTodayLocalDate();

    const programs = await db.select({
      id: programsTable.id,
      name: programsTable.name,
      durationWeeks: programsTable.durationWeeks,
      startDate: programsTable.startDate,
      isActive: programsTable.isActive,
      previewEnabled: programsTable.previewEnabled,
      previewAllowStart: programsTable.previewAllowStart,
      createdAt: programsTable.createdAt,
    }).from(programsTable)
      .where(and(
        eq(programsTable.athleteId, athleteId),
        ne(programsTable.name, "__libre__"),
      ))
      .orderBy(desc(programsTable.startDate));

    res.json(programs.map(p => ({
      id: p.id,
      name: p.name,
      durationWeeks: p.durationWeeks,
      startDate: p.startDate ?? null,
      isActive: p.isActive,
      previewEnabled: p.previewEnabled ?? false,
      previewAllowStart: p.previewAllowStart ?? false,
      startsInFuture: p.startDate ? p.startDate > todayStr : false,
      createdAt: p.createdAt,
    })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/programs/:programId/preview", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const programId = String(req.params["programId"]);
    const todayStr = getTodayLocalDate();

    const [program] = await db.select().from(programsTable)
      .where(and(
        eq(programsTable.id, programId),
        eq(programsTable.athleteId, athleteId),
        ne(programsTable.name, "__libre__"),
      ))
      .limit(1);

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Programme introuvable" } });
      return;
    }

    const startsInFuture = program.startDate ? program.startDate > todayStr : false;

    const programSessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, program.id))
      .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

    const programStartStr = program.startDate ?? new Date().toISOString().slice(0, 10);

    const sessionsWithExercises = await Promise.all(programSessions.map(async (session) => {
      const [variant] = await db.select().from(sessionVariantsTable)
        .where(and(
          eq(sessionVariantsTable.sessionId, session.id),
          eq(sessionVariantsTable.mode, "normal")
        ))
        .limit(1);

      const blocks = await db.select().from(sessionBlocksTable)
        .where(eq(sessionBlocksTable.sessionId, session.id))
        .orderBy(sessionBlocksTable.orderIndex);

      let exercises: { id: string; name: string; sets: number; reps: string | null; loadKg: number | null; restSeconds: number | null; durationSeconds: number | null; blockId: string | null; orderIndex: number; demoUrl: string | null; gifUrl: string | null }[] = [];

      if (variant) {
        const exs = await db.select({
          id: sessionExercisesTable.id,
          exerciseName: exercisesTable.name,
          sets: sessionExercisesTable.sets,
          reps: sessionExercisesTable.reps,
          loadKg: sessionExercisesTable.loadKg,
          restSeconds: sessionExercisesTable.restSeconds,
          durationSeconds: sessionExercisesTable.durationSeconds,
          blockId: sessionExercisesTable.blockId,
          orderIndex: sessionExercisesTable.orderIndex,
          demoUrl: exercisesTable.demoUrl,
          demoGifUrl: exercisesTable.demoGifUrl,
        }).from(sessionExercisesTable)
          .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
          .where(eq(sessionExercisesTable.variantId, variant.id))
          .orderBy(sessionExercisesTable.orderIndex);

        exercises = exs.map(e => ({
          id: e.id,
          name: e.exerciseName,
          sets: e.sets,
          reps: e.reps ?? null,
          loadKg: e.loadKg ? parseFloat(e.loadKg) : null,
          restSeconds: e.restSeconds ?? null,
          durationSeconds: e.durationSeconds ?? null,
          blockId: e.blockId ?? null,
          orderIndex: e.orderIndex,
          demoUrl: e.demoUrl ?? null,
          gifUrl: e.demoGifUrl ?? null,
        }));
      }

      const scheduledDate = computeSessionDate(programStartStr, session.weekNumber, session.dayNumber);

      return {
        sessionId: session.id,
        name: session.name,
        type: session.type,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        scheduledDate,
        estimatedDurationMin: session.estimatedDurationMin,
        coachNotes: session.coachNotes ?? null,
        blocks: blocks.map(b => ({ id: b.id, type: b.type, name: b.name ?? null, orderIndex: b.orderIndex })),
        exercises,
      };
    }));

    res.json({
      programId: program.id,
      programName: program.name,
      startDate: program.startDate ?? null,
      durationWeeks: program.durationWeeks,
      isActive: program.isActive,
      startsInFuture,
      previewEnabled: program.previewEnabled ?? false,
      previewAllowStart: program.previewAllowStart ?? false,
      sessions: sessionsWithExercises,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/athlete/preview-program", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const todayStr = getTodayLocalDate();

    const [program] = await db.select().from(programsTable)
      .where(and(
        eq(programsTable.athleteId, athleteId),
        eq(programsTable.previewEnabled, true),
        eq(programsTable.isActive, true),
      ))
      .orderBy(asc(programsTable.startDate))
      .limit(1);

    if (!program?.startDate || program.startDate <= todayStr) {
      res.json(null);
      return;
    }

    const programSessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, program.id))
      .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

    const programStartStrPrev = program.startDate;

    const sessionsWithExercises = await Promise.all(programSessions.map(async (session) => {
      const [variant] = await db.select().from(sessionVariantsTable)
        .where(and(
          eq(sessionVariantsTable.sessionId, session.id),
          eq(sessionVariantsTable.mode, "normal")
        ))
        .limit(1);

      const blocks = await db.select().from(sessionBlocksTable)
        .where(eq(sessionBlocksTable.sessionId, session.id))
        .orderBy(sessionBlocksTable.orderIndex);

      let exercises: { id: string; name: string; sets: number; reps: string | null; loadKg: number | null; restSeconds: number | null; durationSeconds: number | null; blockId: string | null; orderIndex: number; demoUrl: string | null; gifUrl: string | null }[] = [];

      if (variant) {
        const exs = await db.select({
          id: sessionExercisesTable.id,
          exerciseName: exercisesTable.name,
          sets: sessionExercisesTable.sets,
          reps: sessionExercisesTable.reps,
          loadKg: sessionExercisesTable.loadKg,
          restSeconds: sessionExercisesTable.restSeconds,
          durationSeconds: sessionExercisesTable.durationSeconds,
          blockId: sessionExercisesTable.blockId,
          orderIndex: sessionExercisesTable.orderIndex,
          demoUrl: exercisesTable.demoUrl,
          demoGifUrl: exercisesTable.demoGifUrl,
        }).from(sessionExercisesTable)
          .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
          .where(eq(sessionExercisesTable.variantId, variant.id))
          .orderBy(sessionExercisesTable.orderIndex);

        exercises = exs.map(e => ({
          id: e.id,
          name: e.exerciseName,
          sets: e.sets,
          reps: e.reps ?? null,
          loadKg: e.loadKg ? parseFloat(e.loadKg) : null,
          restSeconds: e.restSeconds ?? null,
          durationSeconds: e.durationSeconds ?? null,
          blockId: e.blockId ?? null,
          orderIndex: e.orderIndex,
          demoUrl: e.demoUrl ?? null,
          gifUrl: e.demoGifUrl ?? null,
        }));
      }

      const scheduledDate = computeSessionDate(programStartStrPrev, session.weekNumber, session.dayNumber);

      return {
        sessionId: session.id,
        name: session.name,
        type: session.type,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        scheduledDate,
        estimatedDurationMin: session.estimatedDurationMin,
        coachNotes: session.coachNotes ?? null,
        blocks: blocks.map(b => ({ id: b.id, type: b.type, name: b.name ?? null, orderIndex: b.orderIndex })),
        exercises,
      };
    }));

    res.json({
      programId: program.id,
      programName: program.name,
      startDate: program.startDate,
      durationWeeks: program.durationWeeks,
      previewEnabled: program.previewEnabled ?? false,
      previewAllowStart: program.previewAllowStart ?? false,
      sessions: sessionsWithExercises,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/athlete/programs/:programId/start-now", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const programId = String(req.params["programId"]);

    const [program] = await db.select({ id: programsTable.id, athleteId: programsTable.athleteId, previewEnabled: programsTable.previewEnabled, previewAllowStart: programsTable.previewAllowStart, startDate: programsTable.startDate })
      .from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.athleteId, athleteId)));

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Programme introuvable" } });
      return;
    }

    if (!program.previewEnabled) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Ce programme n'est pas en mode aperçu" } });
      return;
    }

    if (!program.previewAllowStart) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Le coach n'a pas autorisé le démarrage anticipé" } });
      return;
    }

    const todayStr = getTodayLocalDate();
    await db.update(programsTable)
      .set({ startDate: todayStr, previewEnabled: false, previewAllowStart: false })
      .where(eq(programsTable.id, programId));

    res.json({ success: true, startDate: todayStr });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/sessions/:sessionLogId/exercise-logs", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionLogId = String(req.params["sessionLogId"]);
    const athleteId = req.user!.userId;

    const [log] = await db.select({ id: sessionLogsTable.id, athleteId: sessionLogsTable.athleteId })
      .from(sessionLogsTable)
      .where(eq(sessionLogsTable.id, sessionLogId));

    if (!log || log.athleteId !== athleteId) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Log introuvable" } });
      return;
    }

    const logs = await db.select({
      id: exerciseLogsTable.id,
      exerciseId: exerciseLogsTable.exerciseId,
      setsCompleted: exerciseLogsTable.setsCompleted,
      repsPerSet: exerciseLogsTable.repsPerSet,
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      notes: exerciseLogsTable.notes,
      createdAt: exerciseLogsTable.createdAt,
    }).from(exerciseLogsTable).where(eq(exerciseLogsTable.sessionLogId, sessionLogId));

    res.json(logs.map(l => ({
      ...l,
      loadKgUsed: l.loadKgUsed != null ? parseFloat(String(l.loadKgUsed)) : null,
    })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/sessions/:sessionLogId/log-exercise", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionLogId = String(req.params["sessionLogId"]);
    const athleteId = req.user!.userId;

    const schema = z.object({
      exerciseId: z.string().uuid(),
      setsCompleted: z.number().int().min(1).optional(),
      repsPerSet: z.array(z.number()).optional(),
      loadKgUsed: z.number().min(0).optional(),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Données invalides" } });
      return;
    }

    const [log] = await db.select({ id: sessionLogsTable.id, athleteId: sessionLogsTable.athleteId })
      .from(sessionLogsTable)
      .where(eq(sessionLogsTable.id, sessionLogId));

    if (!log || log.athleteId !== athleteId) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Log introuvable" } });
      return;
    }

    const { exerciseId, setsCompleted, repsPerSet, loadKgUsed, notes } = parsed.data;

    await db.insert(exerciseLogsTable).values({
      sessionLogId,
      exerciseId,
      setsCompleted: setsCompleted ?? null,
      repsPerSet: repsPerSet ?? null,
      loadKgUsed: loadKgUsed != null ? String(loadKgUsed) : null,
      notes: notes ?? null,
    });

    const prefReps = repsPerSet != null && repsPerSet.length > 0
      ? String(repsPerSet[0])
      : null;
    await db.insert(athleteExercisePreferencesTable).values({
      athleteId,
      exerciseId,
      preferredSets: setsCompleted ?? null,
      preferredReps: prefReps,
      preferredLoadKg: loadKgUsed != null ? String(loadKgUsed) : null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [athleteExercisePreferencesTable.athleteId, athleteExercisePreferencesTable.exerciseId],
      set: {
        preferredSets: setsCompleted ?? null,
        preferredReps: prefReps,
        preferredLoadKg: loadKgUsed != null ? String(loadKgUsed) : null,
        updatedAt: sql`now()`,
      },
    });

    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/sessions/:sessionLogId/exercise-logs/:exerciseId", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const sessionLogId = String(req.params["sessionLogId"]);
    const exerciseId = String(req.params["exerciseId"]);
    const athleteId = req.user!.userId;

    const [log] = await db.select({ id: sessionLogsTable.id, athleteId: sessionLogsTable.athleteId })
      .from(sessionLogsTable)
      .where(eq(sessionLogsTable.id, sessionLogId));

    if (!log || log.athleteId !== athleteId) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Log introuvable" } });
      return;
    }

    await db.delete(exerciseLogsTable)
      .where(and(
        eq(exerciseLogsTable.sessionLogId, sessionLogId),
        eq(exerciseLogsTable.exerciseId, exerciseId),
      ));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
