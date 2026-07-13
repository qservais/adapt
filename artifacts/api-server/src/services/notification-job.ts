import cron from "node-cron";
import { db } from "@workspace/db";
import {
  scheduledNotificationsTable,
  notificationsTable,
  usersTable,
  sessionsTable,
  programsTable,
  motivationPhrasesTable,
} from "@workspace/db";
import type { ScheduledNotification } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { notifyUser } from "./notify.service.js";
import { DEFAULT_MOTIVATION_PHRASES } from "../lib/motivation-phrases-seed.js";

async function getRandomPhrase(coachId: string): Promise<string> {
  const [row] = await db
    .select({ text: motivationPhrasesTable.text })
    .from(motivationPhrasesTable)
    .where(and(eq(motivationPhrasesTable.coachId, coachId), eq(motivationPhrasesTable.active, true)))
    .orderBy(sql`random()`)
    .limit(1);
  if (row) return row.text;
  // A coach with an empty/fully-deactivated bank still gets a phrase.
  return DEFAULT_MOTIVATION_PHRASES[Math.floor(Math.random() * DEFAULT_MOTIVATION_PHRASES.length)]!;
}

function shouldFireToday(
  recurrenceType: string,
  recurrenceConfig: Record<string, unknown>,
  now: Date
): boolean {
  if (recurrenceType === "daily") return true;
  if (recurrenceType === "weekly") {
    const days = recurrenceConfig["days"];
    if (Array.isArray(days)) {
      const todayDay = now.getDay();
      return (days as number[]).includes(todayDay);
    }
    return false;
  }
  if (recurrenceType === "custom") {
    const days = recurrenceConfig["days"];
    if (Array.isArray(days)) {
      const todayDay = now.getDay();
      return (days as number[]).includes(todayDay);
    }
    return false;
  }
  return false;
}

async function getSessionSummaryForAthlete(athleteId: string, todayDate: string): Promise<string | null> {
  try {
    const today = new Date(todayDate);

    const programs = await db
      .select({ id: programsTable.id, startDate: programsTable.startDate })
      .from(programsTable)
      .where(and(eq(programsTable.athleteId, athleteId), eq(programsTable.isActive, true)));

    for (const program of programs) {
      if (!program.startDate) continue;
      const start = new Date(program.startDate);
      const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
      if (diffDays < 0) continue;
      const weekNumber = Math.floor(diffDays / 7) + 1;
      const dayNumber = (diffDays % 7) + 1;

      const sessions = await db
        .select({
          name: sessionsTable.name,
          type: sessionsTable.type,
          estimatedDurationMin: sessionsTable.estimatedDurationMin,
        })
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.programId, program.id),
            eq(sessionsTable.weekNumber, weekNumber),
            eq(sessionsTable.dayNumber, dayNumber)
          )
        )
        .limit(1);

      if (sessions.length > 0) {
        const s = sessions[0]!;
        const type = s.type ? ` · ${s.type}` : "";
        const duration = s.estimatedDurationMin ? ` · ${s.estimatedDurationMin} min` : "";
        return `Séance : ${s.name}${type}${duration}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function runMorningNotifications(currentHour: number): Promise<void> {
  logger.info({ currentHour }, "Checking morning notifications...");

  const coaches = await db
    .select({ id: usersTable.id, morningNotifHour: usersTable.morningNotifHour, firstName: usersTable.firstName })
    .from(usersTable)
    .where(eq(usersTable.role, "coach"));

  const today = new Date().toISOString().split("T")[0]!;

  for (const coach of coaches) {
    const targetHour = coach.morningNotifHour ?? 7;
    // Window-based: trigger any time after target hour today.
    // Idempotency is enforced by the per-day notification check below,
    // so a server restart in the first minute of the target hour will
    // still catch up on the next hourly tick.
    if (currentHour < targetHour) continue;

    const athletes = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName })
      .from(usersTable)
      .where(and(eq(usersTable.coachId, coach.id), eq(usersTable.role, "athlete")));

    for (const athlete of athletes) {
      const existing = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, athlete.id),
            eq(notificationsTable.type, "morning_motivation"),
            sql`date_trunc('day', created_at) = current_date`
          )
        );
      if (existing.length > 0) continue;

      const phrase = await getRandomPhrase(coach.id);
      const sessionSummary = await getSessionSummaryForAthlete(athlete.id, today);
      const body = sessionSummary ? `${phrase}\n\n📋 ${sessionSummary}` : `${phrase}\n\n🌿 Journée de récupération — profites-en pour te reposer.`;
      const title = "Bonjour ! Voici ta dose de motivation 💪";

      await notifyUser({
        userId: athlete.id,
        type: "morning_motivation",
        title,
        body,
        link: "/(tabs)/session",
      });

      logger.info({ athleteId: athlete.id, coachId: coach.id }, "Morning notification sent");
    }
  }
}

async function sendReminderToAthlete(notif: ScheduledNotification, athleteId: string): Promise<void> {
  const existing = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, athleteId),
        eq(notificationsTable.sourceType, "scheduled_notification"),
        eq(notificationsTable.sourceId, notif.id),
        sql`date_trunc('day', created_at) = current_date`
      )
    );
  if (existing.length > 0) return;

  await notifyUser({
    userId: athleteId,
    type: "scheduled_reminder",
    title: "Rappel de ton coach",
    body: notif.message,
    link: "/(tabs)/session",
    sourceType: "scheduled_notification",
    sourceId: notif.id,
  });

  logger.info({ notifId: notif.id, athleteId }, "Scheduled reminder sent");
}

async function runScheduledReminders(currentHour: number): Promise<void> {
  logger.info({ currentHour }, "Checking scheduled reminders...");

  const now = new Date();
  const activeNotifs = await db
    .select()
    .from(scheduledNotificationsTable)
    .where(
      and(
        eq(scheduledNotificationsTable.active, true),
        eq(scheduledNotificationsTable.sendHour, currentHour)
      )
    );

  if (activeNotifs.length === 0) return;

  for (const notif of activeNotifs) {
    const config = (notif.recurrenceConfig ?? {}) as Record<string, unknown>;
    if (!shouldFireToday(notif.recurrenceType, config, now)) continue;

    if (notif.athleteId) {
      await sendReminderToAthlete(notif, notif.athleteId);
      continue;
    }

    // Broadcast: resolved against the coach's *current* athlete roster at
    // send time, not a snapshot frozen when the reminder was created.
    const athletes = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.coachId, notif.coachId), eq(usersTable.role, "athlete")));
    for (const athlete of athletes) {
      await sendReminderToAthlete(notif, athlete.id);
    }
  }
}

async function runNotificationJobs(): Promise<void> {
  const currentHour = new Date().getHours();
  await Promise.all([
    runMorningNotifications(currentHour),
    runScheduledReminders(currentHour),
  ]);
}

export function startNotificationJob(): void {
  cron.schedule("0 * * * *", async () => {
    try {
      await runNotificationJobs();
    } catch (err) {
      logger.error(err, "Notification job failed");
    }
  });

  logger.info("Notification job scheduled (every hour on the hour)");
}
