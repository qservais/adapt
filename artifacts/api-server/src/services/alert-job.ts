import cron from "node-cron";
import { db } from "@workspace/db";
import { checkinsTable, sessionLogsTable, alertsTable, usersTable, exerciseLogsTable, sessionExercisesTable, sessionVariantsTable } from "@workspace/db";
import { eq, and, desc, gte, isNull, not, lt, sql, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";

async function createAlertIfNotExists(
  coachId: string,
  athleteId: string,
  type: string,
  priority: string,
  message: string
): Promise<void> {
  const existing = await db.select({ id: alertsTable.id }).from(alertsTable)
    .where(and(
      eq(alertsTable.athleteId, athleteId),
      eq(alertsTable.type, type as "pain" | "inactivity" | "low_score" | "high_rpe" | "missed_checkins" | "load_progression"),
      eq(alertsTable.isResolved, false)
    ));

  if (existing.length === 0) {
    await db.insert(alertsTable).values({
      coachId,
      athleteId,
      type: type as "pain" | "inactivity" | "low_score" | "high_rpe" | "missed_checkins" | "load_progression",
      priority: priority as "p1" | "p2" | "p3",
      message,
    });
    logger.info({ athleteId, type, priority }, "Alert created");
  }
}

async function runAlertChecks(): Promise<void> {
  logger.info("Running daily alert checks...");

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000);

  const athletes = await db.select({
    id: usersTable.id,
    coachId: usersTable.coachId,
    firstName: usersTable.firstName,
  })
    .from(usersTable)
    .where(and(eq(usersTable.role, "athlete"), not(isNull(usersTable.coachId))));

  for (const athlete of athletes) {
    const coachId = athlete.coachId;
    if (!coachId) continue;

    // ─── P2: Inactivity — no check-in in 3 days ──────────────────────────────
    const recentCheckins = await db.select({ id: checkinsTable.id }).from(checkinsTable)
      .where(and(
        eq(checkinsTable.athleteId, athlete.id),
        gte(checkinsTable.createdAt, threeDaysAgo)
      ));

    if (recentCheckins.length === 0) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "inactivity",
        "p2",
        `${athlete.firstName} n'a pas effectué de check-in depuis plus de 3 jours`
      );
    }

    // ─── P1: Consecutive low ADAPT scores (< 25 for 2 consecutive days) ──────
    const recentScores = await db.select({
      adaptScore: checkinsTable.adaptScore,
    })
      .from(checkinsTable)
      .where(and(
        eq(checkinsTable.athleteId, athlete.id),
        gte(checkinsTable.createdAt, twoDaysAgo)
      ))
      .orderBy(desc(checkinsTable.createdAt))
      .limit(2);

    if (recentScores.length >= 2 && recentScores.every(s => s.adaptScore < 25)) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "low_score",
        "p1",
        `${athlete.firstName} a un score ADAPT critique (< 25) depuis 2 jours consécutifs`
      );
    }

    // ─── P2: High RPE — >= 9.5 on 2 consecutive sessions ────────────────────
    // RPE is stored as smallint (integer), so 9.5 means stored >= 10 after rounding
    // but we allow the full scale 1-10; threshold is "reported RPE" >= 9 or 10
    // Per spec: RPE >= 9.5 — since we store integers, we match >= 10
    const recentRpe = await db.select({ rpe: sessionLogsTable.rpe })
      .from(sessionLogsTable)
      .where(and(
        eq(sessionLogsTable.athleteId, athlete.id),
        not(isNull(sessionLogsTable.rpe)),
        gte(sessionLogsTable.createdAt, twoDaysAgo)
      ))
      .orderBy(desc(sessionLogsTable.createdAt))
      .limit(2);

    // RPE stored as 1-10 integer; spec says >= 9.5 means we check >= 10
    if (recentRpe.length >= 2 && recentRpe.every(s => s.rpe !== null && s.rpe >= 10)) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "high_rpe",
        "p2",
        `${athlete.firstName} a un RPE maximal (10/10) sur 2 séances consécutives`
      );
    }

    // ─── P3: Load progression stalled — no increase over 4 weeks ─────────────
    // Check if the athlete has sessions and compare avg load this week vs 4 weeks ago
    const fourWeeksAgoStart = new Date(now.getTime() - 28 * 86400000);
    const threeWeeksAgoStart = new Date(now.getTime() - 21 * 86400000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

    const oldLogs = await db.select({ loadKgUsed: exerciseLogsTable.loadKgUsed })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(and(
        eq(sessionLogsTable.athleteId, athlete.id),
        gte(sessionLogsTable.createdAt, fourWeeksAgoStart),
        lt(sessionLogsTable.createdAt, threeWeeksAgoStart),
        not(isNull(exerciseLogsTable.loadKgUsed))
      ));

    const newLogs = await db.select({ loadKgUsed: exerciseLogsTable.loadKgUsed })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(and(
        eq(sessionLogsTable.athleteId, athlete.id),
        gte(sessionLogsTable.createdAt, oneWeekAgo),
        not(isNull(exerciseLogsTable.loadKgUsed))
      ));

    if (oldLogs.length >= 3 && newLogs.length >= 3) {
      const avgOld = oldLogs.reduce((sum, l) => sum + parseFloat(l.loadKgUsed!), 0) / oldLogs.length;
      const avgNew = newLogs.reduce((sum, l) => sum + parseFloat(l.loadKgUsed!), 0) / newLogs.length;

      if (avgNew <= avgOld) {
        await createAlertIfNotExists(
          coachId,
          athlete.id,
          "load_progression",
          "p3",
          `${athlete.firstName} n'a pas progressé en charge sur les 4 dernières semaines (moy. ${avgOld.toFixed(1)} kg → ${avgNew.toFixed(1)} kg)`
        );
      }
    }
  }

  // ─── ALC-02: Fatigue/Soreness — ≥4/5 courbatures OR hasPain, for 2+ strictly consecutive days ──
  // Fetch last 3 check-ins ordered by date descending; verify the top 2 are exactly 1 day apart
  const threeDaysAgoDate = new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0];

  for (const athlete of athletes) {
    const coachId = athlete.coachId;
    if (!coachId) continue;

    const recentCheckins = await db.select({
      date: checkinsTable.date,
      soreness: checkinsTable.soreness,
      energy: checkinsTable.energy,
      hasPain: checkinsTable.hasPain,
    })
      .from(checkinsTable)
      .where(and(
        eq(checkinsTable.athleteId, athlete.id),
        gte(checkinsTable.date, threeDaysAgoDate)
      ))
      .orderBy(desc(checkinsTable.date))
      .limit(3);

    if (recentCheckins.length >= 2) {
      const [c1, c2] = recentCheckins;
      if (!c1 || !c2) continue;

      // Verify the two most recent check-ins are strictly consecutive (exactly 1 day apart)
      const d1 = new Date(c1.date + "T12:00:00Z");
      const d2 = new Date(c2.date + "T12:00:00Z");
      const diffDays = Math.round((d1.getTime() - d2.getTime()) / 86400000);
      const areConsecutive = diffDays === 1;

      if (!areConsecutive) continue;

      // Fatigue defined as: soreness (courbatures) ≥4/5 OR hasPain === true for both days
      const isFatiguedOrSore = (c: typeof c1) =>
        (c.soreness !== null && c.soreness >= 4) ||
        c.hasPain === true;

      const bothFatiguedOrSore = isFatiguedOrSore(c1) && isFatiguedOrSore(c2);

      if (bothFatiguedOrSore) {
        const reasons: string[] = [];
        if (c1.soreness !== null && c1.soreness >= 4) reasons.push(`courbatures ${c1.soreness}/5`);
        if (c1.hasPain) reasons.push("douleur signalée");
        if (c1.energy !== null && c1.energy <= 2) reasons.push(`énergie basse ${c1.energy}/5`);

        await createAlertIfNotExists(
          coachId,
          athlete.id,
          "fatigue",
          "p1",
          `${athlete.firstName} signale fatigue/douleur élevée depuis 2+ jours consécutifs (${reasons.join(", ")})`
        );
      } else {
        // Auto-resolve fatigue alerts when values normalize
        await db.update(alertsTable)
          .set({ isResolved: true, resolvedAt: new Date() })
          .where(and(
            eq(alertsTable.athleteId, athlete.id),
            eq(alertsTable.type, "fatigue"),
            eq(alertsTable.isResolved, false)
          ));
      }
    }
  }

  logger.info("Daily alert checks complete");
}

export function startAlertJob(): void {
  cron.schedule("0 9 * * *", async () => {
    try {
      await runAlertChecks();
    } catch (err) {
      logger.error(err, "Alert job failed");
    }
  });

  logger.info("Alert job scheduled (daily at 09:00)");
}
