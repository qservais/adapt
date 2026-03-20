import { Router } from "express";
import { db } from "@workspace/db";
import { checkinsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable, exercisesTable, programsTable, sessionLogsTable, alertsTable, usersTable } from "@workspace/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { calculateAdaptScore } from "../services/adapt-engine.js";
import { checkAfterCheckin } from "../services/badgeService.js";
import { z } from "zod";

const router = Router();

const checkinSchema = z.object({
  sleep: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  motivation: z.number().int().min(1).max(5),
  hasPain: z.boolean().optional().default(false),
  painNotes: z.string().nullable().optional(),
  cyclePhase: z.enum(["menstrual", "follicular", "ovulatory", "luteal"]).nullable().optional(),
});

router.post("/checkins", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  // Enforce check-in window: closed after configurable hour (default 22:00)
  const tz = process.env["APP_TIMEZONE"] ?? "Europe/Paris";
  const cutoffHour = parseInt(process.env["CHECKIN_CUTOFF_HOUR"] ?? "22", 10);
  const localHour = parseInt(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }), 10);
  if (localHour >= cutoffHour) {
    res.status(422).json({ error: { code: "CHECKIN_WINDOW_CLOSED", message: `Fenêtre de check-in fermée après ${cutoffHour}h00` } });
    return;
  }

  // Check for duplicate
  const existing = await db.select({ id: checkinsTable.id })
    .from(checkinsTable)
    .where(and(eq(checkinsTable.athleteId, req.user!.userId), eq(checkinsTable.date, today)));
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "CHECKIN_ALREADY_EXISTS", message: "Already checked in today" } });
    return;
  }

  // Get yesterday's RPE
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const [yesterdayLog] = await db.select({ rpe: sessionLogsTable.rpe })
    .from(sessionLogsTable)
    .where(and(
      eq(sessionLogsTable.athleteId, req.user!.userId),
      gte(sessionLogsTable.createdAt, new Date(`${yesterday}T00:00:00Z`)),
      lte(sessionLogsTable.createdAt, new Date(`${yesterday}T23:59:59Z`))
    ))
    .orderBy(desc(sessionLogsTable.createdAt))
    .limit(1);

  const { sleep, energy, stress, soreness, motivation, hasPain, painNotes, cyclePhase } = parsed.data;

  // Force recovery if pain
  let { adaptScore, sessionMode } = calculateAdaptScore({
    sleep, energy, stress, soreness, motivation,
    rpeYesterday: yesterdayLog?.rpe ?? null,
    cyclePhase: cyclePhase ?? null,
  });

  if (hasPain) {
    sessionMode = "recovery";
  }

  const [checkin] = await db.insert(checkinsTable).values({
    athleteId: req.user!.userId,
    date: today,
    sleep,
    energy,
    stress,
    soreness,
    motivation,
    hasPain: hasPain ?? false,
    painNotes: painNotes ?? null,
    cyclePhase: cyclePhase ?? null,
    adaptScore,
    sessionMode,
  }).returning();

  // Create P1 alert if pain reported
  if (hasPain) {
    const [user] = await db.select({ coachId: usersTable.coachId, firstName: usersTable.firstName })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId));
    await db.insert(alertsTable).values({
      coachId: user?.coachId ?? null,
      athleteId: req.user!.userId,
      type: "pain",
      priority: "p1",
      message: `${user?.firstName || "Athlete"} a signalé une douleur : ${painNotes || "pas de détails"}`,
      isRead: false,
      isResolved: false,
    });
  }

  // Find session preview
  const activeProgram = await db.select({ id: programsTable.id })
    .from(programsTable)
    .where(and(eq(programsTable.athleteId, req.user!.userId), eq(programsTable.isActive, true)))
    .limit(1);

  let sessionPreview = null;
  if (activeProgram.length > 0) {
    const dayOfWeek = new Date().getDay(); // 0=Sun,1=Mon,...
    const dayMap: Record<number, number> = { 1: 1, 3: 3, 5: 5 }; // Mon/Wed/Fri
    const dayNum = dayMap[dayOfWeek] ?? 1;

    const [session] = await db.select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      estimatedDurationMin: sessionsTable.estimatedDurationMin,
    })
      .from(sessionsTable)
      .where(and(eq(sessionsTable.programId, activeProgram[0].id), eq(sessionsTable.dayNumber, dayNum)))
      .limit(1);

    if (session) {
      const [variant] = await db.select({ id: sessionVariantsTable.id })
        .from(sessionVariantsTable)
        .where(and(eq(sessionVariantsTable.sessionId, session.id), eq(sessionVariantsTable.mode, sessionMode)));

      let exerciseCount = 0;
      if (variant) {
        const exs = await db.select({ id: sessionExercisesTable.id })
          .from(sessionExercisesTable)
          .where(eq(sessionExercisesTable.variantId, variant.id));
        exerciseCount = exs.length;
      }

      sessionPreview = {
        name: session.name,
        estimatedDurationMin: session.estimatedDurationMin,
        exerciseCount,
      };
    }
  }

  const checkinHour = new Date().getHours();
  const newBadges = await checkAfterCheckin(req.user!.userId, checkinHour);

  res.status(201).json({
    checkin: {
      id: checkin.id,
      date: checkin.date,
      sleep: checkin.sleep,
      energy: checkin.energy,
      stress: checkin.stress,
      soreness: checkin.soreness,
      motivation: checkin.motivation,
      hasPain: checkin.hasPain,
      painNotes: checkin.painNotes,
      cyclePhase: checkin.cyclePhase,
      adaptScore: checkin.adaptScore,
      sessionMode: checkin.sessionMode,
      createdAt: checkin.createdAt,
    },
    sessionPreview,
    newBadges,
  });
});

router.get("/checkins/today", authenticate, requireRole("athlete"), async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const [checkin] = await db.select().from(checkinsTable)
    .where(and(eq(checkinsTable.athleteId, req.user!.userId), eq(checkinsTable.date, today)));

  if (!checkin) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No check-in today" } });
    return;
  }
  res.json(checkin);
});

router.get("/checkins/history", authenticate, requireRole("athlete"), async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const checkins = await db.select().from(checkinsTable)
    .where(and(eq(checkinsTable.athleteId, req.user!.userId), gte(checkinsTable.date, thirtyDaysAgo)))
    .orderBy(desc(checkinsTable.date));
  res.json(checkins);
});

export default router;
