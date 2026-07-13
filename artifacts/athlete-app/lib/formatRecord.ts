export type RecordType = "load" | "reps" | "time" | "distance";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return sec === 0 ? `${min}min` : `${min}min ${sec}s`;
}

// Renders a PR value in the unit appropriate to its recordType. Load goes
// through formatWeight (the app's existing kg/lbs preference-aware
// formatter); the other three types have no unit-preference toggle, so
// they're rendered directly.
export function formatRecordValue(
  recordType: string,
  value: number,
  formatWeight: (kg: number | null | undefined) => string,
): string {
  switch (recordType as RecordType) {
    case "reps":
      return `${value} reps`;
    case "time":
      return formatDuration(value);
    case "distance":
      return `${value} m`;
    case "load":
    default:
      return formatWeight(value);
  }
}

// Gain/delta direction flips for "time" — a lower duration is the
// improvement, so (previous - value) is positive on a PR, not (value - previous).
export function recordGain(recordType: string, value: number, previousValue: number): number {
  return recordType === "time" ? previousValue - value : value - previousValue;
}
