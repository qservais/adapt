import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, checkinsTable, sessionLogsTable, exerciseLogsTable, exercisesTable, alertsTable, programsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable, performanceTestsTable } from "@workspace/db";
import { eq, and, desc, asc, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/coach/dashboard", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athletes = await db.select().from(usersTable)
      .where(and(eq(usersTable.coachId, coachId), eq(usersTable.role, "athlete")));

    if (athletes.length === 0) {
      res.json({ todayAthletes: [], upcomingSessions: [], pastSessions: [], recentCompleted: [], activeAlerts: [] });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const athleteIds = athletes.map(a => a.id);

    // Today's check-ins
    const todayCheckins = await db.select().from(checkinsTable)
      .where(and(
        eq(checkinsTable.date, today),
      ));
    const checkinByAthlete = new Map(todayCheckins.filter(c => athleteIds.includes(c.athleteId)).map(c => [c.athleteId, c]));

    // Most recent check-in date per athlete (for inactivity detection)
    const allRecentCheckins = await db.select({
      athleteId: checkinsTable.athleteId,
      date: checkinsTable.date,
    }).from(checkinsTable)
      .where(inArray(checkinsTable.athleteId, athleteIds))
      .orderBy(desc(checkinsTable.date));
    const lastCheckinByAthlete = new Map<string, string>();
    for (const c of allRecentCheckins) {
      if (!lastCheckinByAthlete.has(c.athleteId)) {
        lastCheckinByAthlete.set(c.athleteId, c.date);
      }
    }

    const todayAthletes = athletes.map(a => {
      const checkin = checkinByAthlete.get(a.id);
      const lastCheckinDate = lastCheckinByAthlete.get(a.id) ?? null;
      const daysSinceCheckin = lastCheckinDate
        ? Math.floor((Date.now() - new Date(lastCheckinDate).getTime()) / 86400000)
        : null;
      return {
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        adaptScore: checkin?.adaptScore ?? null,
        sessionMode: checkin?.sessionMode ?? null,
        hasCheckin: !!checkin,
        lastCheckinDate,
        daysSinceCheckin,
      };
    });

    // Upcoming (today → +7 days) and past (-7 days → yesterday) planned sessions from active programs
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split("T")[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const activePrograms = await db.select().from(programsTable)
      .where(eq(programsTable.isActive, true));
    const myPrograms = activePrograms.filter(p => athleteIds.includes(p.athleteId));

    type SessionEntry = {
      athleteId: string;
      athleteName: string;
      sessionId: string;
      sessionName: string;
      sessionType: string;
      scheduledDate: string;
      estimatedDurationMin: number | null;
      isCompleted: boolean;
      isMissed: boolean;
    };

    const upcomingSessions: SessionEntry[] = [];
    const pastSessions: SessionEntry[] = [];

    for (const program of myPrograms) {
      if (!program.startDate) continue;
      const athlete = athletes.find(a => a.id === program.athleteId);
      if (!athlete) continue;

      const programSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.programId, program.id));
      const programStart = new Date(program.startDate);

      const completedLogs = await db.select({ sessionId: sessionLogsTable.sessionId })
        .from(sessionLogsTable)
        .where(and(
          eq(sessionLogsTable.athleteId, athlete.id),
          isNotNull(sessionLogsTable.completedAt),
        ));
      const completedIds = new Set(completedLogs.filter(l => l.sessionId).map(l => l.sessionId));

      for (const session of programSessions) {
        const sessionDate = new Date(programStart);
        sessionDate.setDate(programStart.getDate() + (session.weekNumber - 1) * 7 + (session.dayNumber - 1));
        sessionDate.setHours(0, 0, 0, 0);
        const dateStr = sessionDate.toISOString().split("T")[0];
        const isCompleted = completedIds.has(session.id);

        const entry: SessionEntry = {
          athleteId: athlete.id,
          athleteName: `${athlete.firstName} ${athlete.lastName ?? ""}`.trim(),
          sessionId: session.id,
          sessionName: session.name,
          sessionType: session.type,
          scheduledDate: dateStr,
          estimatedDurationMin: session.estimatedDurationMin,
          isCompleted,
          isMissed: dateStr < today && !isCompleted,
        };

        if (dateStr >= today && dateStr <= sevenDaysLaterStr) {
          upcomingSessions.push(entry);
        } else if (dateStr >= sevenDaysAgoStr && dateStr < today) {
          pastSessions.push(entry);
        }
      }
    }
    upcomingSessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    pastSessions.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

    // Active (unresolved) alerts for this coach's athletes
    const activeAlerts = athleteIds.length === 0 ? [] : await db.select({
      id: alertsTable.id,
      athleteId: alertsTable.athleteId,
      type: alertsTable.type,
      priority: alertsTable.priority,
      message: alertsTable.message,
      createdAt: alertsTable.createdAt,
    }).from(alertsTable)
      .where(and(
        inArray(alertsTable.athleteId, athleteIds),
        eq(alertsTable.isResolved, false),
      ))
      .orderBy(desc(alertsTable.createdAt))
      .limit(5);

    const activeAlertsWithName = activeAlerts.map(a => {
      const athlete = athletes.find(x => x.id === a.athleteId);
      return {
        ...a,
        createdAt: a.createdAt?.toISOString() ?? null,
        athleteName: athlete ? `${athlete.firstName} ${athlete.lastName ?? ""}`.trim() : "Athlète",
      };
    });

    // Last 5 completed sessions — scoped to this coach's athletes at SQL level
    const myLogs = athleteIds.length === 0 ? [] : await db.select({
      id: sessionLogsTable.id,
      athleteId: sessionLogsTable.athleteId,
      sessionId: sessionLogsTable.sessionId,
      variantMode: sessionLogsTable.variantMode,
      rpe: sessionLogsTable.rpe,
      completedAt: sessionLogsTable.completedAt,
    }).from(sessionLogsTable)
      .where(and(
        inArray(sessionLogsTable.athleteId, athleteIds),
        isNotNull(sessionLogsTable.completedAt),
      ))
      .orderBy(desc(sessionLogsTable.completedAt))
      .limit(5);
    const sessionIds = myLogs.filter(l => l.sessionId).map(l => l.sessionId!);
    const sessionNames = sessionIds.length > 0
      ? await db.select({ id: sessionsTable.id, name: sessionsTable.name }).from(sessionsTable)
        .where(inArray(sessionsTable.id, sessionIds))
      : [];
    const sessionNameMap = new Map(sessionNames.map(s => [s.id, s.name]));

    const recentCompleted = myLogs.map(log => {
      const athlete = athletes.find(a => a.id === log.athleteId);
      return {
        id: log.id,
        athleteId: log.athleteId,
        athleteName: athlete ? `${athlete.firstName} ${athlete.lastName ?? ""}`.trim() : "Athlète",
        sessionName: log.sessionId ? (sessionNameMap.get(log.sessionId) ?? "Séance libre") : "Séance libre",
        variantMode: log.variantMode,
        rpe: log.rpe,
        completedAt: log.completedAt?.toISOString() ?? null,
      };
    });

    res.json({ todayAthletes, upcomingSessions, pastSessions, recentCompleted, activeAlerts: activeAlertsWithName });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// Calendar endpoint: returns all sessions for all athletes for a given month
router.get("/coach/calendar", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string); // 1-based
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: { code: "INVALID_PARAMS", message: "year and month (1-12) required" } });
      return;
    }

    const athletes = await db.select().from(usersTable)
      .where(and(eq(usersTable.coachId, coachId), eq(usersTable.role, "athlete")));

    if (athletes.length === 0) {
      res.json([]);
      return;
    }

    const athleteIds = athletes.map(a => a.id);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // last day of month
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthEndStr = monthEnd.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const activePrograms = await db.select().from(programsTable)
      .where(eq(programsTable.isActive, true));
    const myPrograms = activePrograms.filter(p => athleteIds.includes(p.athleteId));

    const sessionsByDate = new Map<string, Array<{
      athleteId: string;
      athleteName: string;
      sessionId: string;
      sessionName: string;
      sessionType: string;
      estimatedDurationMin: number | null;
      isCompleted: boolean;
      isMissed: boolean;
    }>>();

    for (const program of myPrograms) {
      if (!program.startDate) continue;
      const athlete = athletes.find(a => a.id === program.athleteId);
      if (!athlete) continue;

      const programSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.programId, program.id));
      const programStart = new Date(program.startDate);

      const completedLogs = await db.select({ sessionId: sessionLogsTable.sessionId })
        .from(sessionLogsTable)
        .where(and(
          eq(sessionLogsTable.athleteId, athlete.id),
          isNotNull(sessionLogsTable.completedAt),
        ));
      const completedIds = new Set(completedLogs.filter(l => l.sessionId).map(l => l.sessionId));

      for (const session of programSessions) {
        const sessionDate = new Date(programStart);
        sessionDate.setDate(programStart.getDate() + (session.weekNumber - 1) * 7 + (session.dayNumber - 1));
        sessionDate.setHours(0, 0, 0, 0);
        const dateStr = sessionDate.toISOString().split("T")[0];

        if (dateStr >= monthStartStr && dateStr <= monthEndStr) {
          const isCompleted = completedIds.has(session.id);
          const arr = sessionsByDate.get(dateStr) ?? [];
          arr.push({
            athleteId: athlete.id,
            athleteName: `${athlete.firstName} ${athlete.lastName ?? ""}`.trim(),
            sessionId: session.id,
            sessionName: session.name,
            sessionType: session.type,
            estimatedDurationMin: session.estimatedDurationMin,
            isCompleted,
            isMissed: dateStr < todayStr && !isCompleted,
          });
          sessionsByDate.set(dateStr, arr);
        }
      }
    }

    const result = Array.from(sessionsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sessions]) => ({ date, sessions }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athletes = await db.select().from(usersTable)
      .where(and(eq(usersTable.coachId, req.user!.userId), eq(usersTable.role, "athlete")));

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.all(athletes.map(async (athlete) => {
      const [todayCheckin] = await db.select().from(checkinsTable)
        .where(and(eq(checkinsTable.athleteId, athlete.id), eq(checkinsTable.date, today)));

      const activeAlerts = await db.select({ id: alertsTable.id }).from(alertsTable)
        .where(and(eq(alertsTable.athleteId, athlete.id), eq(alertsTable.isResolved, false)));

      const [lastSession] = await db.select({ createdAt: sessionLogsTable.createdAt }).from(sessionLogsTable)
        .where(eq(sessionLogsTable.athleteId, athlete.id))
        .orderBy(desc(sessionLogsTable.createdAt))
        .limit(1);

      return {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email,
        fitnessLevel: athlete.fitnessLevel,
        primaryGoal: athlete.primaryGoal,
        todayCheckin: todayCheckin ? {
          id: todayCheckin.id,
          date: todayCheckin.date,
          adaptScore: todayCheckin.adaptScore,
          sessionMode: todayCheckin.sessionMode,
          hasPain: todayCheckin.hasPain,
          sleep: todayCheckin.sleep,
          energy: todayCheckin.energy,
          stress: todayCheckin.stress,
          soreness: todayCheckin.soreness,
          motivation: todayCheckin.motivation,
          createdAt: todayCheckin.createdAt,
        } : null,
        activeAlerts: activeAlerts.length,
        lastSessionDate: lastSession?.createdAt?.toISOString() ?? null,
      };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:clientId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);

    const [athlete] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));

    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client not found or not linked" } });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [todayCheckin] = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athlete.id), eq(checkinsTable.date, today)));

    const recentCheckins = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athlete.id), gte(checkinsTable.date, thirtyDaysAgo)))
      .orderBy(desc(checkinsTable.date));

    const recentSessions = await db.select().from(sessionLogsTable)
      .where(eq(sessionLogsTable.athleteId, athlete.id))
      .orderBy(desc(sessionLogsTable.createdAt))
      .limit(10);

    const activeAlerts = await db.select().from(alertsTable)
      .where(and(eq(alertsTable.athleteId, athlete.id), eq(alertsTable.isResolved, false)))
      .orderBy(desc(alertsTable.createdAt));

    // Upcoming planned sessions from active program
    const [activeProgram] = await db.select().from(programsTable)
      .where(and(eq(programsTable.athleteId, athlete.id), eq(programsTable.isActive, true)))
      .limit(1);

    let upcomingSessions: Array<{
      sessionId: string;
      sessionName: string;
      sessionType: string;
      weekNumber: number;
      dayNumber: number;
      scheduledDate: string;
      estimatedDurationMin: number | null;
      isCompleted: boolean;
    }> = [];

    if (activeProgram?.startDate) {
      const programStart = new Date(activeProgram.startDate);

      const plannedSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.programId, activeProgram.id));

      // Query all session logs for this program for accurate completion status
      const allProgramLogs = await db.select({ sessionId: sessionLogsTable.sessionId })
        .from(sessionLogsTable)
        .where(eq(sessionLogsTable.athleteId, athlete.id));

      const completedSessionIds = new Set(
        allProgramLogs.filter(s => s.sessionId).map(s => s.sessionId)
      );

      for (const session of plannedSessions) {
        const sessionDate = new Date(programStart);
        sessionDate.setDate(programStart.getDate() + (session.weekNumber - 1) * 7 + (session.dayNumber - 1));
        sessionDate.setHours(0, 0, 0, 0);

        // Return ALL program sessions (no date window) so monthly calendar navigation works
        upcomingSessions.push({
          sessionId: session.id,
          sessionName: session.name,
          sessionType: session.type,
          weekNumber: session.weekNumber,
          dayNumber: session.dayNumber,
          scheduledDate: sessionDate.toISOString().split("T")[0],
          estimatedDurationMin: session.estimatedDurationMin,
          isCompleted: completedSessionIds.has(session.id),
        });
      }

      upcomingSessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    }

    res.json({
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      email: athlete.email,
      age: athlete.age,
      weightKg: athlete.weightKg,
      heightCm: athlete.heightCm,
      fitnessLevel: athlete.fitnessLevel,
      primaryGoal: athlete.primaryGoal,
      cycleTracking: athlete.cycleTracking,
      inviteCode: athlete.inviteCode,
      todayCheckin: todayCheckin ?? null,
      recentCheckins,
      recentSessions,
      upcomingSessions,
      activeAlerts: activeAlerts.map(a => ({
        id: a.id,
        athleteId: a.athleteId,
        athleteName: `${athlete.firstName} ${athlete.lastName ?? ""}`.trim(),
        type: a.type,
        priority: a.priority,
        message: a.message,
        isRead: a.isRead,
        isResolved: a.isResolved,
        resolvedAt: a.resolvedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/clients/:clientId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);

    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));

    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client not found or not linked" } });
      return;
    }

    await db.update(usersTable).set({ coachId: null }).where(eq(usersTable.id, clientId));
    res.json({ success: true, message: "Client unlinked" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const coachUpdateAthleteSchema = z.object({
  heightCm: z.number().int().min(50).max(300).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  primaryGoal: z.enum(["strength", "muscle", "fat_loss", "performance", "health", "aesthetic", "fitness"]).optional(),
  trainingFrequency: z.number().int().min(1).max(14).optional(),
  injuries: z.string().optional(),
});

router.patch("/coach/clients/:clientId/profile", authenticate, requireRole("coach"), async (req, res) => {
  const clientId = String(req.params["clientId"]);
  const parsed = coachUpdateAthleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Athlète non trouvé ou non lié" } });
      return;
    }
    const data = parsed.data;
    const [updated] = await db.update(usersTable).set({
      ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
      ...(data.weightKg !== undefined && { weightKg: data.weightKg.toString() }),
      ...(data.fitnessLevel !== undefined && { fitnessLevel: data.fitnessLevel }),
      ...(data.primaryGoal !== undefined && { primaryGoal: data.primaryGoal }),
      ...(data.trainingFrequency !== undefined && { trainingFrequency: data.trainingFrequency }),
      ...(data.injuries !== undefined && { injuries: data.injuries }),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, clientId)).returning({
      id: usersTable.id,
      heightCm: usersTable.heightCm,
      weightKg: usersTable.weightKg,
      fitnessLevel: usersTable.fitnessLevel,
      primaryGoal: usersTable.primaryGoal,
    });
    res.json({ success: true, athlete: updated });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/coach/clients/:clientId/checkins", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);

    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));

    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client not found or not linked" } });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const checkins = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, clientId), gte(checkinsTable.date, thirtyDaysAgo)))
      .orderBy(desc(checkinsTable.date));

    res.json(checkins);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const overrideSchema = z.object({
  mode: z.enum(["performance", "normal", "adapt", "recovery"]),
});

router.post("/coach/clients/:clientId/override", authenticate, requireRole("coach"), async (req, res) => {
  const clientId = String(req.params["clientId"]);
  const parsed = overrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { mode } = parsed.data;

  try {
    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));

    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client not found or not linked" } });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    await db.update(checkinsTable).set({ sessionMode: mode })
      .where(and(eq(checkinsTable.athleteId, clientId), eq(checkinsTable.date, today)));

    res.json({ success: true, message: `Session mode overridden to ${mode}` });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/alerts", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const alerts = await db.select({
      id: alertsTable.id,
      athleteId: alertsTable.athleteId,
      type: alertsTable.type,
      priority: alertsTable.priority,
      message: alertsTable.message,
      isRead: alertsTable.isRead,
      isResolved: alertsTable.isResolved,
      resolvedAt: alertsTable.resolvedAt,
      createdAt: alertsTable.createdAt,
      athleteFirstName: usersTable.firstName,
      athleteLastName: usersTable.lastName,
    })
      .from(alertsTable)
      .innerJoin(usersTable, eq(alertsTable.athleteId, usersTable.id))
      .where(and(eq(alertsTable.coachId, req.user!.userId), eq(alertsTable.isResolved, false)))
      .orderBy(alertsTable.priority, desc(alertsTable.createdAt));

    res.json(alerts.map(a => ({
      id: a.id,
      athleteId: a.athleteId,
      athleteName: `${a.athleteFirstName} ${a.athleteLastName ?? ""}`.trim(),
      type: a.type,
      priority: a.priority,
      message: a.message,
      isRead: a.isRead,
      isResolved: a.isResolved,
      resolvedAt: a.resolvedAt,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const resolveAlertSchema = z.object({
  resolutionNote: z.string().min(1).optional(),
});

router.put("/coach/alerts/:alertId/resolve", authenticate, requireRole("coach"), async (req, res) => {
  const alertId = String(req.params["alertId"]);
  const parsed = resolveAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { resolutionNote } = parsed.data;

  try {
    const [alert] = await db.select({ id: alertsTable.id }).from(alertsTable)
      .where(and(eq(alertsTable.id, alertId), eq(alertsTable.coachId, req.user!.userId)));

    if (!alert) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Alert not found" } });
      return;
    }

    await db.update(alertsTable).set({
      isResolved: true,
      resolutionNote: resolutionNote ?? null,
      resolvedAt: new Date(),
    }).where(eq(alertsTable.id, alertId));

    res.json({ success: true, message: "Alert resolved" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/invite-code", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const [coach] = await db.select({ inviteCode: usersTable.inviteCode }).from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ inviteCode: coach?.inviteCode ?? null });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const linkClientSchema = z.object({
  athleteEmail: z.string().email(),
});

router.post("/coach/clients/link", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = linkClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { athleteEmail } = parsed.data;

  try {
    const [athlete] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, coachId: usersTable.coachId })
      .from(usersTable)
      .where(and(eq(usersTable.email, athleteEmail.toLowerCase()), eq(usersTable.role, "athlete")));

    if (!athlete) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Athlete not found" } });
      return;
    }

    if (athlete.coachId && athlete.coachId !== req.user!.userId) {
      res.status(409).json({ error: { code: "ATHLETE_ALREADY_LINKED", message: "Athlete is already linked to a different coach" } });
      return;
    }

    await db.update(usersTable).set({ coachId: req.user!.userId }).where(eq(usersTable.id, athlete.id));
    res.json({ success: true, message: `${athlete.firstName} is now linked to your roster` });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// Coach endpoints: link/unlink athlete by invite code
const coachLinkSchema = z.object({
  inviteCode: z.string().length(6),
});

router.post("/coach/link", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = coachLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Code invalide (6 caractères requis)" } });
    return;
  }
  const { inviteCode } = parsed.data;
  try {
    const [athlete] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, coachId: usersTable.coachId })
      .from(usersTable)
      .where(and(eq(usersTable.inviteCode, inviteCode.toUpperCase()), eq(usersTable.role, "athlete")));

    if (!athlete) {
      res.status(404).json({ error: { code: "INVITE_CODE_INVALID", message: "Code d'invitation invalide" } });
      return;
    }
    if (athlete.coachId && athlete.coachId !== req.user!.userId) {
      res.status(409).json({ error: { code: "ATHLETE_ALREADY_LINKED", message: "Cet athlète est déjà lié à un autre coach" } });
      return;
    }
    await db.update(usersTable).set({ coachId: req.user!.userId, updatedAt: new Date() }).where(eq(usersTable.id, athlete.id));
    res.json({ success: true, message: `${athlete.firstName} est maintenant dans votre équipe` });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.post("/coach/unlink", authenticate, requireRole("coach"), async (req, res) => {
  const schema = z.object({ athleteId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "athleteId invalide" } });
    return;
  }
  const { athleteId } = parsed.data;
  try {
    const [athlete] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, coachId: usersTable.coachId })
      .from(usersTable)
      .where(and(eq(usersTable.id, athleteId), eq(usersTable.role, "athlete")));

    if (!athlete || athlete.coachId !== req.user!.userId) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Athlète non trouvé ou non lié" } });
      return;
    }
    await db.update(usersTable).set({ coachId: null, updatedAt: new Date() }).where(eq(usersTable.id, athleteId));
    res.json({ success: true, message: `${athlete.firstName} a été retiré de votre équipe` });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

const athleteLinkSchema = z.object({
  inviteCode: z.string().min(1).max(10).toUpperCase(),
});

router.post("/athlete/link", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = athleteLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { inviteCode } = parsed.data;

  try {
    const [coachWithCode] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.inviteCode, inviteCode.toUpperCase()), eq(usersTable.role, "coach")));

    if (!coachWithCode) {
      res.status(400).json({ error: { code: "INVITE_CODE_INVALID", message: "Invalid invite code" } });
      return;
    }

    await db.update(usersTable).set({ coachId: coachWithCode.id }).where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true, message: "Linked to coach successfully" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Weekly Volume ─────────────────────────────────────────────────────────────

router.get("/coach/volume-weekly", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athletes = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.coachId, coachId), eq(usersTable.role, "athlete")));
    if (athletes.length === 0) {
      res.json([]);
      return;
    }
    const athleteIds = athletes.map(a => a.id);
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const rows = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${sessionLogsTable.completedAt}), 'IYYY-IW')`.as("week"),
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(sessionLogsTable)
      .where(
        and(
          inArray(sessionLogsTable.athleteId, athleteIds),
          isNotNull(sessionLogsTable.completedAt),
          gte(sessionLogsTable.completedAt, eightWeeksAgo),
        )
      )
      .groupBy(sql`date_trunc('week', ${sessionLogsTable.completedAt})`)
      .orderBy(sql`date_trunc('week', ${sessionLogsTable.completedAt})`);

    res.json(rows);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

// ─── Performance Tests ─────────────────────────────────────────────────────────

const createTestSchema = z.object({
  testType: z.string().min(1).max(50),
  exerciseId: z.string().uuid().optional(),
  exerciseName: z.string().max(100).optional(),
  value: z.number().positive(),
  unit: z.string().min(1).max(20),
  testedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

router.get("/coach/clients/:clientId/tests", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);
    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client non trouvé ou non lié" } });
      return;
    }
    const tests = await db.select().from(performanceTestsTable)
      .where(eq(performanceTestsTable.athleteId, clientId))
      .orderBy(desc(performanceTestsTable.testedAt));
    res.json(tests.map(t => ({ ...t, value: parseFloat(String(t.value)) })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.post("/coach/clients/:clientId/tests", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);
    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client non trouvé ou non lié" } });
      return;
    }
    const parsed = createTestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const { testType, exerciseId, exerciseName, value, unit, testedAt, notes } = parsed.data;
    const [test] = await db.insert(performanceTestsTable).values({
      athleteId: clientId,
      coachId: req.user!.userId,
      testType,
      exerciseId: exerciseId ?? null,
      exerciseName: exerciseName ?? null,
      value: value.toString(),
      unit,
      testedAt,
      notes: notes ?? null,
    }).returning();
    res.status(201).json({ ...test, value: parseFloat(String(test!.value)) });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.delete("/coach/clients/:clientId/tests/:testId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);
    const testId = String(req.params["testId"]);
    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client non trouvé ou non lié" } });
      return;
    }
    const [test] = await db.select({ id: performanceTestsTable.id }).from(performanceTestsTable)
      .where(and(eq(performanceTestsTable.id, testId), eq(performanceTestsTable.athleteId, clientId)));
    if (!test) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Test introuvable" } });
      return;
    }
    await db.delete(performanceTestsTable).where(eq(performanceTestsTable.id, testId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

// GET /coach/clients/:clientId/sessions/:sessionLogId — Charges réelles vs prescrites
router.get("/coach/clients/:clientId/sessions/:sessionLogId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const clientId = String(req.params["clientId"]);
    const sessionLogId = String(req.params["sessionLogId"]);

    const [athlete] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, clientId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Client non trouvé ou non lié" } });
      return;
    }

    const [sessionLog] = await db.select().from(sessionLogsTable)
      .where(and(eq(sessionLogsTable.id, sessionLogId), eq(sessionLogsTable.athleteId, clientId)));
    if (!sessionLog) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Journal de séance introuvable" } });
      return;
    }

    let sessionName = "Séance libre";
    const prescribedMap: Record<string, { sets: number; reps: string | null; loadKg: number | null; coachCue: string | null }> = {};

    if (sessionLog.sessionId) {
      const [sess] = await db.select({ name: sessionsTable.name }).from(sessionsTable)
        .where(eq(sessionsTable.id, sessionLog.sessionId));
      if (sess) sessionName = sess.name;

      const [variant] = await db.select({ id: sessionVariantsTable.id }).from(sessionVariantsTable)
        .where(and(
          eq(sessionVariantsTable.sessionId, sessionLog.sessionId),
          eq(sessionVariantsTable.mode, sessionLog.variantMode)
        ));

      if (variant) {
        const prescribed = await db.select({
          exerciseId: sessionExercisesTable.exerciseId,
          sets: sessionExercisesTable.sets,
          reps: sessionExercisesTable.reps,
          loadKg: sessionExercisesTable.loadKg,
          coachCue: sessionExercisesTable.coachCue,
        }).from(sessionExercisesTable)
          .where(eq(sessionExercisesTable.variantId, variant.id))
          .orderBy(sessionExercisesTable.orderIndex);

        for (const pe of prescribed) {
          prescribedMap[pe.exerciseId] = {
            sets: pe.sets,
            reps: pe.reps ?? null,
            loadKg: pe.loadKg != null ? parseFloat(String(pe.loadKg)) : null,
            coachCue: pe.coachCue ?? null,
          };
        }
      }
    }

    const actualLogs = await db.select({
      exerciseId: exerciseLogsTable.exerciseId,
      exerciseName: exercisesTable.name,
      setsCompleted: exerciseLogsTable.setsCompleted,
      repsPerSet: exerciseLogsTable.repsPerSet,
      loadKgUsed: exerciseLogsTable.loadKgUsed,
      notes: exerciseLogsTable.notes,
    }).from(exerciseLogsTable)
      .innerJoin(exercisesTable, eq(exerciseLogsTable.exerciseId, exercisesTable.id))
      .where(eq(exerciseLogsTable.sessionLogId, sessionLogId));

    const durationMin = sessionLog.startedAt && sessionLog.completedAt
      ? Math.max(1, Math.round(
          (new Date(sessionLog.completedAt).getTime() - new Date(sessionLog.startedAt).getTime()) / 60000
        ))
      : null;

    const exercises = actualLogs.map(log => ({
      exerciseId: log.exerciseId,
      exerciseName: log.exerciseName,
      prescribed: prescribedMap[log.exerciseId] ?? null,
      actual: {
        setsCompleted: log.setsCompleted,
        repsPerSet: log.repsPerSet,
        loadKgUsed: log.loadKgUsed != null ? parseFloat(String(log.loadKgUsed)) : null,
        notes: log.notes,
      },
    }));

    res.json({
      id: sessionLog.id,
      sessionName,
      variantMode: sessionLog.variantMode,
      rpe: sessionLog.rpe,
      athleteNotes: sessionLog.athleteNotes ?? null,
      completedAt: sessionLog.completedAt?.toISOString() ?? null,
      durationMin,
      exercises,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

export default router;
