import cron from "node-cron";
import { db } from "@workspace/db";
import {
  scheduledNotificationsTable,
  notificationsTable,
  usersTable,
  sessionsTable,
  programsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const PHRASES_MOTIVATION = [
  "Chaque répétition te rapproche de la meilleure version de toi-même.",
  "La discipline d'aujourd'hui est la performance de demain.",
  "Le corps atteint ce que l'esprit croit possible.",
  "Pas de raccourci — juste du travail bien fait.",
  "Tu es plus fort(e) que tu ne le penses. Prouve-le aujourd'hui.",
  "La régularité bat le talent qui ne travaille pas.",
  "Chaque effort compte, même les petits.",
  "Tu n'as pas à être parfait(e), tu dois juste avancer.",
  "La douleur d'aujourd'hui est ta force de demain.",
  "Un pas à la fois. C'est comme ça que les grandes choses se font.",
  "Fais confiance au processus. Les résultats viennent avec le temps.",
  "L'excellence n'est pas un acte, c'est une habitude.",
  "Tes limites sont là pour être repoussées.",
  "Entraîne-toi dur, récupère bien, recommence.",
  "Le seul mauvais entraînement est celui qu'on n'a pas fait.",
  "Sois la version la plus forte de toi-même, chaque jour.",
  "Le succès est la somme de petits efforts répétés chaque jour.",
  "Crois en toi. Tu as déjà surmonté des choses plus difficiles.",
  "Donne le meilleur de toi-même et laisse l'entraînement faire le reste.",
  "Progresse à ton rythme — mais ne t'arrête jamais.",
];

function randomPhrase(): string {
  return PHRASES_MOTIVATION[Math.floor(Math.random() * PHRASES_MOTIVATION.length)]!;
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
        const duration = s.estimatedDurationMin ? ` · ${s.estimatedDurationMin} min` : "";
        return `Séance : ${s.name}${duration}`;
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
    if (targetHour !== currentHour) continue;

    const athletes = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName })
      .from(usersTable)
      .where(and(eq(usersTable.coachId, coach.id), eq(usersTable.role, "athlete")));

    for (const athlete of athletes) {
      const dedupKey = `morning-${today}-${athlete.id}`;
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

      const phrase = randomPhrase();
      const sessionSummary = await getSessionSummaryForAthlete(athlete.id, today);
      const body = sessionSummary ? `${phrase}\n\n📋 ${sessionSummary}` : `${phrase}\n\n🌿 Journée de récupération — profites-en pour te reposer.`;

      await db.insert(notificationsTable).values({
        userId: athlete.id,
        type: "morning_motivation",
        title: "Bonjour ! Voici ta dose de motivation 💪",
        body,
      });

      logger.info({ athleteId: athlete.id, coachId: coach.id }, "Morning notification sent");
    }
  }
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

  const today = now.toISOString().split("T")[0]!;

  for (const notif of activeNotifs) {
    const config = (notif.recurrenceConfig ?? {}) as Record<string, unknown>;
    if (!shouldFireToday(notif.recurrenceType, config, now)) continue;

    const dedupKey = `sched-${notif.id}-${today}`;
    const existing = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, notif.athleteId),
          eq(notificationsTable.type, "scheduled_reminder"),
          sql`body LIKE ${`%${notif.id}%`}`,
          sql`date_trunc('day', created_at) = current_date`
        )
      );
    if (existing.length > 0) continue;

    await db.insert(notificationsTable).values({
      userId: notif.athleteId,
      type: "scheduled_reminder",
      title: "Rappel de ton coach",
      body: `${notif.message}\n\n[ref:${notif.id}]`,
    });

    logger.info({ notifId: notif.id, athleteId: notif.athleteId }, "Scheduled reminder sent");
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
