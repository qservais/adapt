import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  checkinsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable,
  exercisesTable, programsTable, sessionLogsTable, exerciseLogsTable, alertsTable,
  performanceTestsTable, coachAppointmentsTable,
} from "@workspace/db";
import { eq, and, desc, asc, gte, inArray, isNotNull } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { calculateAdaptedLoad } from "../services/adapt-engine.js";
import { detectNewPRs, getAthleteCurrentPRs } from "../services/prService.js";
import { checkAfterSession, checkAfterFeedback } from "../services/badgeService.js";
import { z } from "zod";
import { getTodayLocalDate, localDateFromTimestamp, getLocalDayNumber, dateDiffDays } from "../lib/dateUtils.js";

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
  const diff = dateDiffDays(startDateStr, todayStr);
  const trainingWeek = Math.min(Math.max(1, Math.floor(diff / 7) + 1), program.durationWeeks ?? 1);

  let sessions = await db.select().from(sessionsTable)
    .where(and(
      eq(sessionsTable.programId, program.id),
      eq(sessionsTable.weekNumber, trainingWeek),
      eq(sessionsTable.dayNumber, dayNum)
    ))
    .orderBy(asc(sessionsTable.createdAt));

  if (sessions.length === 0) {
    sessions = await db.select().from(sessionsTable)
      .where(and(eq(sessionsTable.programId, program.id), eq(sessionsTable.dayNumber, dayNum)))
      .orderBy(asc(sessionsTable.createdAt));
  }

  return sessions;
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
    if (existingLogs.length === 0) {
      const [newLog] = await db.insert(sessionLogsTable).values({
        athleteId, sessionId: null, variantMode: forcedMode, checkinId: checkin.id,
      }).returning();
      const logs = [newLog!];
      return { logs, total: 1, completed: 0 };
    }
    const completed = existingLogs.filter(l => l.completedAt != null).length;
    return { logs: existingLogs, total: existingLogs.length, completed };
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (existing.completedAt && new Date(existing.completedAt) < sevenDaysAgo) {
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
    const today = new Date(`${todayStr}T00:00:00Z`);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const plannedSessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, activeProgram.id));

    const allLogs = await db.select({ sessionId: sessionLogsTable.sessionId, completedAt: sessionLogsTable.completedAt })
      .from(sessionLogsTable)
      .where(and(eq(sessionLogsTable.athleteId, athleteId), isNotNull(sessionLogsTable.completedAt)));

    const completedSessionIds = new Set(
      allLogs.filter((l) => l.sessionId).map((l) => l.sessionId)
    );

    const result = [];
    for (const session of plannedSessions) {
      const sessionDate = new Date(programStart);
      sessionDate.setDate(programStart.getDate() + (session.weekNumber - 1) * 7 + (session.dayNumber - 1));
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate >= today && sessionDate <= in7Days && sessionDate <= programEnd) {
        result.push({
          sessionId: session.id,
          sessionName: session.name,
          sessionType: session.type,
          sessionLocation: session.sessionType ?? "presentiel",
          weekNumber: session.weekNumber,
          dayNumber: session.dayNumber,
          scheduledDate: localDateFromTimestamp(sessionDate),
          estimatedDurationMin: session.estimatedDurationMin,
          isCompleted: completedSessionIds.has(session.id),
          scheduledTime: session.scheduledTime ?? null,
          visioLink: session.visioLink ?? null,
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
        });
      }
    }

    result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    res.json(result);
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
