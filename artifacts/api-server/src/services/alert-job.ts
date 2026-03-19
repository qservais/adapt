import cron from "node-cron";
import { db } from "@workspace/db";
import { checkinsTable, sessionLogsTable, alertsTable, usersTable, exerciseLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, lt, isNull, not, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

async function createAlertIfNotExists(
  coachId: string | null,
  athleteId: string,
  type: string,
  priority: string,
  message: string
) {
  // Check if same type of unresolved alert already exists
  const existing = await db.select({ id: alertsTable.id }).from(alertsTable)
    .where(and(
      eq(alertsTable.athleteId, athleteId),
      eq(alertsTable.type, type as any),
      eq(alertsTable.isResolved, false)
    ));

  if (existing.length === 0) {
    await db.insert(alertsTable).values({
      coachId,
      athleteId,
      type: type as any,
      priority: priority as any,
      message,
    });
  }
}

async function runAlertChecks() {
  logger.info("Running alert checks...");

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000);

  // Get all athletes
  const athletes = await db.select({ id: usersTable.id, coachId: usersTable.coachId, firstName: usersTable.firstName })
    .from(usersTable)
    .where(eq(usersTable.role, "athlete"));

  for (const athlete of athletes) {
    const coachId = athlete.coachId;
    if (!coachId) continue; // Only alert if athlete has a coach

    // P2: Inactivity — no check-in in 3 days
    const recentCheckins = await db.select({ date: checkinsTable.date }).from(checkinsTable)
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
        `${athlete.firstName} n'a pas fait de check-in depuis plus de 3 jours`
      );
    }

    // P1: Consecutive low scores (< 25 for 2 days)
    const recentScores = await db.select({ adaptScore: checkinsTable.adaptScore, date: checkinsTable.date })
      .from(checkinsTable)
      .where(and(
        eq(checkinsTable.athleteId, athlete.id),
        gte(checkinsTable.createdAt, twoDaysAgo)
      ))
      .orderBy(desc(checkinsTable.createdAt))
      .limit(2);

    if (recentScores.length >= 2 && recentScores.every(s => s.adaptScore !== null && s.adaptScore < 25)) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "low_score",
        "p1",
        `${athlete.firstName} a un score ADAPT critique (< 25) depuis 2 jours consécutifs`
      );
    }

    // P2: High RPE — >= 9.5 on 2 consecutive sessions
    const recentRpe = await db.select({ rpe: sessionLogsTable.rpe }).from(sessionLogsTable)
      .where(and(
        eq(sessionLogsTable.athleteId, athlete.id),
        not(isNull(sessionLogsTable.rpe)),
        gte(sessionLogsTable.createdAt, twoDaysAgo)
      ))
      .orderBy(desc(sessionLogsTable.createdAt))
      .limit(2);

    if (recentRpe.length >= 2 && recentRpe.every(s => s.rpe !== null && s.rpe >= 9)) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "high_rpe",
        "p2",
        `${athlete.firstName} a un RPE très élevé (≥ 9) sur 2 séances consécutives`
      );
    }

    // P2: Missed check-ins — 3 consecutive days
    const missedCount = await db.select({ date: checkinsTable.date }).from(checkinsTable)
      .where(and(
        eq(checkinsTable.athleteId, athlete.id),
        gte(checkinsTable.createdAt, threeDaysAgo)
      ));

    if (missedCount.length === 0) {
      await createAlertIfNotExists(
        coachId,
        athlete.id,
        "missed_checkins",
        "p2",
        `${athlete.firstName} a manqué 3 check-ins consécutifs`
      );
    }
  }

  logger.info("Alert checks complete");
}

export function startAlertJob() {
  // Run daily at 09:00
  cron.schedule("0 9 * * *", async () => {
    try {
      await runAlertChecks();
    } catch (err) {
      logger.error(err, "Alert job failed");
    }
  });

  logger.info("Alert job scheduled (daily at 09:00)");
}
