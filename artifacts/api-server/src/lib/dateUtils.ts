const APP_TZ = process.env["APP_TIMEZONE"] ?? "Europe/Brussels";

export function getTodayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

export function localDateFromTimestamp(ts: Date | string): string {
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: APP_TZ });
}
