import { db } from "@workspace/db";
import { badgesTable, userBadgesTable, checkinsTable, sessionLogsTable } from "@workspace/db";
import { eq, and, count, sql, desc } from "drizzle-orm";

export interface NewBadge {
  code: string;
  name: string;
  icon: string;
}

async function unlock(userId: string, badgeCode: string): Promise<NewBadge | null> {
  const [badge] = await db.select({ id: badgesTable.id, name: badgesTable.name, icon: badgesTable.icon })
    .from(badgesTable)
    .where(eq(badgesTable.code, badgeCode));
  if (!badge) return null;

  const existing = await db.select({ unlockedAt: userBadgesTable.unlockedAt })
    .from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badge.id)));

  if (existing.length > 0) return null;

  try {
    await db.insert(userBadgesTable).values({ userId, badgeId: badge.id });
    return { code: badgeCode, name: badge.name, icon: badge.icon };
  } catch {
    return null;
  }
}

async function getCheckinCount(userId: string): Promise<number> {
  const [r] = await db.select({ cnt: count() }).from(checkinsTable).where(eq(checkinsTable.athleteId, userId));
  return Number(r?.cnt ?? 0);
}

async function getCurrentStreak(userId: string): Promise<number> {
  const checkins = await db.select({ date: checkinsTable.date })
    .from(checkinsTable)
    .where(eq(checkinsTable.athleteId, userId))
    .orderBy(desc(checkinsTable.date));

  if (checkins.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < checkins.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    const checkinDate = new Date(checkins[i].date);
    if (
      checkinDate.getUTCFullYear() === expectedDate.getFullYear() &&
      checkinDate.getUTCMonth() === expectedDate.getMonth() &&
      checkinDate.getUTCDate() === expectedDate.getDate()
    ) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function getCompletedSessionCount(userId: string): Promise<number> {
  const [r] = await db.select({ cnt: count() }).from(sessionLogsTable)
    .where(and(eq(sessionLogsTable.athleteId, userId), sql`${sessionLogsTable.completedAt} IS NOT NULL`));
  return Number(r?.cnt ?? 0);
}

async function getSessionCountByMode(userId: string, mode: string): Promise<number> {
  const [r] = await db.select({ cnt: count() }).from(sessionLogsTable)
    .where(and(
      eq(sessionLogsTable.athleteId, userId),
      eq(sessionLogsTable.variantMode, mode),
      sql`${sessionLogsTable.completedAt} IS NOT NULL`
    ));
  return Number(r?.cnt ?? 0);
}

async function getFeedbackCount(userId: string): Promise<number> {
  const [r] = await db.select({ cnt: count() }).from(sessionLogsTable)
    .where(and(
      eq(sessionLogsTable.athleteId, userId),
      sql`${sessionLogsTable.rpe} IS NOT NULL`
    ));
  return Number(r?.cnt ?? 0);
}

async function getTotalPRCount(userId: string): Promise<number> {
  const result = await db.execute(sql`SELECT COUNT(*) as cnt FROM personal_records WHERE user_id = ${userId}`);
  return Number((result.rows[0] as { cnt: string })?.cnt ?? 0);
}

export async function checkAfterCheckin(userId: string, checkinHour: number): Promise<NewBadge[]> {
  const newBadges: NewBadge[] = [];

  const checkinCount = await getCheckinCount(userId);
  if (checkinCount === 1) {
    const b = await unlock(userId, "first_checkin");
    if (b) newBadges.push(b);
  }

  const streak = await getCurrentStreak(userId);
  for (const { threshold, code } of [
    { threshold: 7, code: "streak_7" },
    { threshold: 14, code: "streak_14" },
    { threshold: 30, code: "streak_30" },
    { threshold: 60, code: "streak_60" },
    { threshold: 100, code: "streak_100" },
  ]) {
    if (streak >= threshold) {
      const b = await unlock(userId, code);
      if (b) newBadges.push(b);
    }
  }

  if (checkinHour < 7) {
    const b = await unlock(userId, "early_bird");
    if (b) newBadges.push(b);
  }

  return newBadges;
}

export async function checkAfterSession(userId: string, variantMode: string, totalPRs: number): Promise<NewBadge[]> {
  const newBadges: NewBadge[] = [];

  const sessionCount = await getCompletedSessionCount(userId);
  if (sessionCount === 1) {
    const b = await unlock(userId, "first_session");
    if (b) newBadges.push(b);
  }

  for (const { threshold, code } of [
    { threshold: 10, code: "sessions_10" },
    { threshold: 25, code: "sessions_25" },
    { threshold: 50, code: "sessions_50" },
    { threshold: 100, code: "sessions_100" },
  ]) {
    if (sessionCount >= threshold) {
      const b = await unlock(userId, code);
      if (b) newBadges.push(b);
    }
  }

  if (variantMode === "recovery") {
    const recoveryCount = await getSessionCountByMode(userId, "recovery");
    if (recoveryCount >= 5) {
      const b = await unlock(userId, "recovery_king");
      if (b) newBadges.push(b);
    }
  }

  if (variantMode === "performance") {
    const perfCount = await getSessionCountByMode(userId, "performance");
    if (perfCount >= 10) {
      const b = await unlock(userId, "performance_beast");
      if (b) newBadges.push(b);
    }
  }

  for (const { threshold, code } of [
    { threshold: 1, code: "first_pr" },
    { threshold: 5, code: "pr_5" },
    { threshold: 10, code: "pr_10" },
  ]) {
    if (totalPRs >= threshold) {
      const b = await unlock(userId, code);
      if (b) newBadges.push(b);
    }
  }

  return newBadges;
}

export async function checkAfterFeedback(userId: string): Promise<NewBadge[]> {
  const newBadges: NewBadge[] = [];
  const feedbackCount = await getFeedbackCount(userId);
  if (feedbackCount >= 20) {
    const b = await unlock(userId, "feedback_pro");
    if (b) newBadges.push(b);
  }
  return newBadges;
}
