import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, checkinsTable, sessionLogsTable, alertsTable, programsTable, sessionsTable } from "@workspace/db";
import { eq, and, desc, gte, inArray, isNotNull } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/coach/dashboard", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athletes = await db.select().from(usersTable)
      .where(and(eq(usersTable.coachId, coachId), eq(usersTable.role, "athlete")));

    if (athletes.length === 0) {
      res.json({ todayAthletes: [], weekSessions: [], recentCompleted: [] });
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

    const todayAthletes = athletes.map(a => {
      const checkin = checkinByAthlete.get(a.id);
      return {
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        adaptScore: checkin?.adaptScore ?? null,
        sessionMode: checkin?.sessionMode ?? null,
        hasCheckin: !!checkin,
      };
    });

    // This week's planned sessions from active programs
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const activePrograms = await db.select().from(programsTable)
      .where(eq(programsTable.isActive, true));
    const myPrograms = activePrograms.filter(p => athleteIds.includes(p.athleteId));

    const weekSessions: Array<{
      athleteId: string;
      athleteName: string;
      sessionId: string;
      sessionName: string;
      sessionType: string;
      scheduledDate: string;
      estimatedDurationMin: number | null;
      isCompleted: boolean;
    }> = [];

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

        if (sessionDate >= weekStart && sessionDate <= weekEnd) {
          weekSessions.push({
            athleteId: athlete.id,
            athleteName: `${athlete.firstName} ${athlete.lastName ?? ""}`.trim(),
            sessionId: session.id,
            sessionName: session.name,
            sessionType: session.type,
            scheduledDate: sessionDate.toISOString().split("T")[0],
            estimatedDurationMin: session.estimatedDurationMin,
            isCompleted: completedIds.has(session.id),
          });
        }
      }
    }
    weekSessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

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

    res.json({ todayAthletes, weekSessions, recentCompleted });
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
      const now = new Date();
      const fourWeeksFromNow = new Date(now.getTime() + 28 * 86400000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

      const plannedSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.programId, activeProgram.id));

      // Query all session logs for this program (no limit) for accurate completion status
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

        if (sessionDate >= twoWeeksAgo && sessionDate <= fourWeeksFromNow) {
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

export default router;
