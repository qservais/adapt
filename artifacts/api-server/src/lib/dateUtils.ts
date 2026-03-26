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
