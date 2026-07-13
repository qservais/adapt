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
 * Anchors on the Monday of the ISO calendar week that contains programStart.
 * dayNumber is 1 = Monday … 7 = Sunday (ISO weekday).
 *
 * Training week 1 = the full Mon–Sun week that includes programStart.
 * Sessions scheduled earlier in that week than programStart are
 * technically before the programme began (callers should guard against this).
 */
export function computeSessionDate(
  programStartStr: string,
  weekNumber: number,
  dayNumber: number
): string {
  const startMs = new Date(programStartStr + "T12:00:00Z").getTime();
  const startDow = new Date(programStartStr + "T12:00:00Z").getUTCDay(); // 0=Sun … 6=Sat
  // How many days back to reach Monday (0=Mon already, 6=Sun → go back 6 days)
  const daysFromMonday = startDow === 0 ? 6 : startDow - 1;
  const weekMondayMs = startMs - daysFromMonday * 86400000;
  // dayNumber-1 is offset from Monday (1→0, 7→6)
  const totalOffset = (weekNumber - 1) * 7 + (dayNumber - 1);
  const targetMs = weekMondayMs + totalOffset * 86400000;
  return new Date(targetMs).toISOString().split("T")[0]!;
}

/**
 * Inverse of computeSessionDate(): given a programme start date and a real
 * calendar date, return which training week/day that date falls on.
 *
 * weekNumber can come back <= 0 for a date before the programme's week 1 —
 * same caveat as computeSessionDate(), callers should guard against it.
 */
export function computeWeekDayFromDate(
  programStartStr: string,
  targetDateStr: string
): { weekNumber: number; dayNumber: number } {
  const startMs = new Date(programStartStr + "T12:00:00Z").getTime();
  const startDow = new Date(programStartStr + "T12:00:00Z").getUTCDay();
  const daysFromMonday = startDow === 0 ? 6 : startDow - 1;
  const weekMondayMs = startMs - daysFromMonday * 86400000;
  const weekMondayStr = new Date(weekMondayMs).toISOString().split("T")[0]!;

  const totalOffset = dateDiffDays(weekMondayStr, targetDateStr);
  const weekNumber = Math.floor(totalOffset / 7) + 1;
  const dayNumber = (((totalOffset % 7) + 7) % 7) + 1;
  return { weekNumber, dayNumber };
}
