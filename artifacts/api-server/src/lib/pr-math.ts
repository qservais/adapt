// Pure functions, no imports — see tests/pr-math.test.ts.

export type RecordType = "load" | "reps" | "time" | "distance";

export interface ExerciseLogMetrics {
  loadKgUsed?: number;
  repsPerSet?: number[];
  durationSecondsUsed?: number;
  distanceMetersUsed?: number;
}

// Maps an exercise's trackingType to the recordType its PR row represents.
// Bodyweight exercises track reps (there's no load to maximize); every
// other tracking type maps 1:1 onto its own record type. Falls back to
// "load" for anything unrecognized, matching the column's own DB default.
export function recordTypeForTracking(trackingType: string): RecordType {
  if (trackingType === "bodyweight") return "reps";
  if (trackingType === "time" || trackingType === "distance") return trackingType;
  return "load";
}

// Picks the one number relevant to this recordType out of everything logged
// for the exercise this session. Returns null when nothing meaningful was
// logged for that type — e.g. a load-type exercise logged with no load, or
// a bodyweight exercise logged with an empty rep list. This generalizes the
// old "skip if no load logged" gate to every tracking type, rather than
// applying it as a blanket bodyweight exclusion.
export function pickLoggedMetric(recordType: RecordType, log: ExerciseLogMetrics): number | null {
  switch (recordType) {
    case "load":
      return log.loadKgUsed && log.loadKgUsed > 0 ? log.loadKgUsed : null;
    case "reps": {
      if (!log.repsPerSet || log.repsPerSet.length === 0) return null;
      const best = Math.max(...log.repsPerSet);
      return best > 0 ? best : null;
    }
    case "time":
      return log.durationSecondsUsed && log.durationSecondsUsed > 0 ? log.durationSecondsUsed : null;
    case "distance":
      return log.distanceMetersUsed && log.distanceMetersUsed > 0 ? log.distanceMetersUsed : null;
  }
}

// Whether `value` beats `previous` for this recordType. Every type is
// "higher is better" except time, where a LOWER duration is the record
// (fastest time) — the one place this generalization can most easily get
// backwards, hence the dedicated test coverage.
export function isNewRecord(recordType: RecordType, value: number, previous: number | null): boolean {
  if (previous === null) return true;
  if (recordType === "time") return value < previous;
  return value > previous;
}
