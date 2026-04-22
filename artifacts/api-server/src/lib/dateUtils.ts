const APP_TZ = process.env["APP_TIMEZONE"] ?? "Europe/Brussels";

export function getTodayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

export function localDateFromTimestamp(ts: Date | string): string {
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

export function getLocalDayNumber(dateStr: string): number {
  const dow = new Date(dateStr + "T12:00:00Z").getDay();
  const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
  return map[dow] ?? 1;
}

export function dateDiffDays(fromDateStr: string, toDateStr: string): number {
  const fromMs = new Date(fromDateStr + "T12:00:00Z").getTime();
  const toMs = new Date(toDateStr + "T12:00:00Z").getTime();
  return Math.floor((toMs - fromMs) / 86400000);
}

/**
 * Compute the real calendar date for a programme session.
 *
 * dayNumber is an absolute day-of-week (1 = Monday, 7 = Sunday).
 * Training week 1 spans [programStart … programStart+6].
 * The session falls on the day-of-week D within training week N,
 * regardless of what weekday programStart itself is.
 */
export function computeSessionDate(
  programStartStr: string,
  weekNumber: number,
  dayNumber: number
): string {
  const startMs = new Date(programStartStr + "T12:00:00Z").getTime();
  const startDow = new Date(programStartStr + "T12:00:00Z").getUTCDay();
  const d0 = startDow === 0 ? 7 : startDow; // convert 0=Sun → 7, keep 1–6
  const offsetInWeek1 = (dayNumber - d0 + 7) % 7;
  const totalOffset = (weekNumber - 1) * 7 + offsetInWeek1;
  const targetMs = startMs + totalOffset * 86400000;
  return new Date(targetMs).toISOString().split("T")[0]!;
}
