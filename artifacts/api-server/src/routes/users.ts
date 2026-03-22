import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, badgesTable, userBadgesTable, personalRecordsTable, exercisesTable, sessionLogsTable, checkinsTable, exerciseLogsTable, programsTable, sessionsTable } from "@workspace/db";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

function userProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    birthDate: user.birthDate,
    age: user.age,
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    trainingFrequency: user.trainingFrequency,
    injuries: user.injuries,
    fitnessLevel: user.fitnessLevel,
    primaryGoal: user.primaryGoal,
    cycleTracking: user.cycleTracking,
    coachId: user.coachId,
    inviteCode: user.inviteCode,
  };
}

router.get("/users/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Utilisateur non trouvé" } });
      return;
    }
    let coachName: string | null = null;
    if (user.coachId) {
      const [coach] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, user.coachId));
      if (coach) {
        coachName = `${coach.firstName} ${coach.lastName ?? ""}`.trim();
      }
    }
    res.json({ ...userProfile(user), coachName });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  gender: z.enum(["homme", "femme", "autre"]).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  age: z.number().int().min(10).max(120).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  heightCm: z.number().int().min(50).max(300).optional(),
  trainingFrequency: z.number().int().min(1).max(14).optional(),
  injuries: z.string().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  primaryGoal: z.enum(["strength", "muscle", "fat_loss", "performance", "health", "aesthetic", "fitness"]).optional(),
  cycleTracking: z.boolean().optional(),
});

router.put("/users/me", authenticate, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const data = parsed.data;
    const [user] = await db.update(usersTable)
      .set({
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.weightKg !== undefined && { weightKg: data.weightKg.toString() }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        ...(data.trainingFrequency !== undefined && { trainingFrequency: data.trainingFrequency }),
        ...(data.injuries !== undefined && { injuries: data.injuries }),
        ...(data.fitnessLevel !== undefined && { fitnessLevel: data.fitnessLevel }),
        ...(data.primaryGoal !== undefined && { primaryGoal: data.primaryGoal }),
        ...(data.cycleTracking !== undefined && { cycleTracking: data.cycleTracking }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json(userProfile(user));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.delete("/users/me/coach", authenticate, async (req, res) => {
  try {
    const [user] = await db.select({ id: usersTable.id, coachId: usersTable.coachId })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId));

    if (!user || !user.coachId) {
      res.status(400).json({ error: { code: "NO_COACH", message: "Aucun coach lié à ce compte" } });
      return;
    }

    await db.update(usersTable)
      .set({ coachId: null, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId));

    res.json({ success: true, message: "Coach délié avec succès" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/users/badges", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const allBadges = await db.select().from(badgesTable).orderBy(badgesTable.sortOrder);
    const unlocked = await db.select({ badgeId: userBadgesTable.badgeId, unlockedAt: userBadgesTable.unlockedAt })
      .from(userBadgesTable)
      .where(eq(userBadgesTable.userId, userId));

    const unlockedMap: Record<string, string> = {};
    for (const ub of unlocked) {
      unlockedMap[ub.badgeId] = ub.unlockedAt ? ub.unlockedAt.toISOString() : "";
    }

    const badges = allBadges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      category: b.category,
      sortOrder: b.sortOrder,
      unlocked: !!unlockedMap[b.id],
      unlockedAt: unlockedMap[b.id] ?? null,
    }));

    res.json({ badges, total: badges.length, unlockedCount: unlocked.length });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/users/prs", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const prs = await db.select({
      exerciseId: personalRecordsTable.exerciseId,
      exerciseName: exercisesTable.name,
      loadKg: personalRecordsTable.loadKg,
      reps: personalRecordsTable.reps,
      previousLoadKg: personalRecordsTable.previousLoadKg,
      achievedAt: personalRecordsTable.achievedAt,
    })
      .from(personalRecordsTable)
      .innerJoin(exercisesTable, eq(personalRecordsTable.exerciseId, exercisesTable.id))
      .where(eq(personalRecordsTable.userId, userId))
      .orderBy(desc(personalRecordsTable.achievedAt));

    const result = prs.map(pr => ({
      exerciseId: pr.exerciseId,
      exerciseName: pr.exerciseName,
      loadKg: parseFloat(pr.loadKg),
      reps: pr.reps,
      previousLoadKg: pr.previousLoadKg ? parseFloat(pr.previousLoadKg) : null,
      achievedAt: pr.achievedAt,
      isRecent: pr.achievedAt ? pr.achievedAt > sevenDaysAgo : false,
    }));

    res.json({ personalRecords: result, total: result.length });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/users/weekly-recap/latest", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(weekStart.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekEnd.getDate() - 6);
    prevWeekStart.setHours(0, 0, 0, 0);
    prevWeekEnd.setHours(23, 59, 59, 999);

    async function getWeekStats(start: Date, end: Date) {
      const weekStartDate = start.toISOString().split("T")[0];
      const weekEndDate = end.toISOString().split("T")[0];

      const [sessions] = await db.select({ cnt: count() }).from(sessionLogsTable)
        .where(and(
          eq(sessionLogsTable.athleteId, userId),
          sql`${sessionLogsTable.completedAt} >= ${start}`,
          sql`${sessionLogsTable.completedAt} <= ${end}`
        ));

      const scoreResult = await db.execute(sql`
        SELECT AVG(adapt_score::float) as avg FROM checkins 
        WHERE athlete_id = ${userId} AND date >= ${weekStartDate} AND date <= ${weekEndDate}
      `);
      const scoreRow = scoreResult.rows[0] as { avg: string | null } | undefined;
      const avgAdaptScore = scoreRow?.avg ? parseFloat(scoreRow.avg) : null;

      const rpeResult = await db.execute(sql`
        SELECT AVG(rpe::float) as avg FROM session_logs
        WHERE athlete_id = ${userId} AND rpe IS NOT NULL
        AND completed_at >= ${start} AND completed_at <= ${end}
      `);
      const rpeRow = rpeResult.rows[0] as { avg: string | null } | undefined;
      const avgRpe = rpeRow?.avg ? parseFloat(rpeRow.avg) : null;

      const volResult = await db.execute(sql`
        SELECT COALESCE(SUM(
          el.load_kg_used::float * el.sets_completed
        ), 0) as total
        FROM exercise_logs el
        JOIN session_logs sl ON el.session_log_id = sl.id
        WHERE sl.athlete_id = ${userId} AND sl.completed_at >= ${start} AND sl.completed_at <= ${end}
        AND el.load_kg_used IS NOT NULL AND el.sets_completed IS NOT NULL
      `);
      const volRow = volResult.rows[0] as { total: string } | undefined;
      const totalVolume = parseFloat(String(volRow?.total ?? "0"));

      const prsResult = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM personal_records
        WHERE user_id = ${userId} AND achieved_at >= ${start} AND achieved_at <= ${end}
      `);
      const prsRow = prsResult.rows[0] as { cnt: string } | undefined;
      const prsCount = Number(prsRow?.cnt ?? 0);

      return {
        sessions: Number(sessions?.cnt ?? 0),
        avgAdaptScore,
        avgRpe,
        totalVolume,
        prsCount,
      };
    }

    const [[thisWeek, lastWeek], activePrograms] = await Promise.all([
      Promise.all([
        getWeekStats(weekStart, weekEnd),
        getWeekStats(prevWeekStart, prevWeekEnd),
      ]),
      db.select({ id: programsTable.id, startDate: programsTable.startDate })
        .from(programsTable)
        .where(and(eq(programsTable.athleteId, userId), eq(programsTable.isActive, true)))
        .limit(1),
    ]);

    let sessionsPlanned = 0;
    if (activePrograms.length > 0) {
      const prog = activePrograms[0];
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const startMs = prog.startDate ? new Date(prog.startDate).getTime() : weekStart.getTime();
      const weekNum = Math.max(1, Math.floor((weekStart.getTime() - startMs) / msPerWeek) + 1);
      const [planCount] = await db.select({ cnt: count() })
        .from(sessionsTable)
        .where(and(eq(sessionsTable.programId, prog.id), eq(sessionsTable.weekNumber, weekNum)));
      sessionsPlanned = Number(planCount?.cnt ?? 0);
    }

    res.json({
      recap: {
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        sessionsCompleted: thisWeek.sessions,
        sessionsPlanned,
        avgAdaptScore: thisWeek.avgAdaptScore,
        avgRpe: thisWeek.avgRpe,
        totalVolumeKg: thisWeek.totalVolume,
        prsCount: thisWeek.prsCount,
        sessionsDelta: thisWeek.sessions - lastWeek.sessions,
        scoreDelta: thisWeek.avgAdaptScore != null && lastWeek.avgAdaptScore != null
          ? parseFloat((thisWeek.avgAdaptScore - lastWeek.avgAdaptScore).toFixed(1)) : null,
        rpeDelta: thisWeek.avgRpe != null && lastWeek.avgRpe != null
          ? parseFloat((thisWeek.avgRpe - lastWeek.avgRpe).toFixed(1)) : null,
        volumeDelta: thisWeek.totalVolume - lastWeek.totalVolume,
      },
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

export default router;
