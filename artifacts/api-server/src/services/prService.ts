import { db } from "@workspace/db";
import { personalRecordsTable, prHistoryTable, exercisesTable, type PersonalRecord } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { recordTypeForTracking, pickLoggedMetric, isNewRecord, type RecordType, type ExerciseLogMetrics } from "../lib/pr-math.js";

export interface NewPR {
  exerciseId: string;
  exerciseName: string;
  recordType: RecordType;
  value: number;
  previousValue: number | null;
  isFirst: boolean;
}

interface ExerciseLogInput extends ExerciseLogMetrics {
  exerciseId: string;
  setsCompleted?: number;
}

function toNumber(v: string | number | null): number | null {
  if (v === null) return null;
  return typeof v === "number" ? v : parseFloat(v);
}

type RecordValueColumns = Pick<PersonalRecord, "loadKg" | "reps" | "durationSeconds" | "distanceMeters">;

// Reads whichever of the four typed columns `recordType` uses on a PR-like
// row, as a plain number regardless of the column's underlying decimal
// (string) vs. integer (number) storage type. Takes just the four value
// columns (not a full PersonalRecord) so partial `db.select({...})`
// projections — like the ones GET /users/prs and its history endpoint use —
// can pass themselves in directly without over-fetching. Exported so those
// read-only routes don't duplicate this branch.
export function currentValueOf(recordType: RecordType, pr: RecordValueColumns): number | null {
  switch (recordType) {
    case "load": return toNumber(pr.loadKg);
    case "reps": return toNumber(pr.reps);
    case "time": return toNumber(pr.durationSeconds);
    case "distance": return toNumber(pr.distanceMeters);
  }
}

// Builds the {loadKg, reps, durationSeconds, distanceMeters} quadruple for
// an insert/update — only the column matching recordType is populated,
// the rest are explicitly null so a row never carries a stale value from
// a previous recordType (relevant if an exercise's trackingType is ever
// changed after PRs already exist for it).
function valueFieldsFor(recordType: RecordType, value: number, contextReps: number | null) {
  return {
    loadKg: recordType === "load" ? value.toString() : null,
    reps: recordType === "reps" ? value : contextReps,
    durationSeconds: recordType === "time" ? value : null,
    distanceMeters: recordType === "distance" ? value.toString() : null,
  };
}

function previousFieldsFor(recordType: RecordType, pr: PersonalRecord) {
  return {
    previousLoadKg: recordType === "load" ? pr.loadKg : null,
    previousReps: recordType === "reps" ? pr.reps : null,
    previousDurationSeconds: recordType === "time" ? pr.durationSeconds : null,
    previousDistanceMeters: recordType === "distance" ? pr.distanceMeters : null,
  };
}

export async function detectNewPRs(
  userId: string,
  sessionLogId: string,
  exercisesLog: ExerciseLogInput[]
): Promise<NewPR[]> {
  const newPRs: NewPR[] = [];

  for (const exLog of exercisesLog) {
    const [exercise] = await db.select({ name: exercisesTable.name, trackingType: exercisesTable.trackingType })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exLog.exerciseId));
    if (!exercise) continue;

    const recordType = recordTypeForTracking(exercise.trackingType);
    const value = pickLoggedMetric(recordType, exLog);
    if (value === null) continue; // nothing meaningful logged for this exercise's tracking type

    const [currentPR] = await db.select().from(personalRecordsTable)
      .where(and(eq(personalRecordsTable.userId, userId), eq(personalRecordsTable.exerciseId, exLog.exerciseId)));

    const currentValue = currentPR ? currentValueOf(recordType, currentPR) : null;
    if (!isNewRecord(recordType, value, currentValue)) continue;

    // Best rep count this session, kept as contextual info even when the
    // record type itself isn't reps (e.g. "100kg x 5").
    const contextReps = exLog.repsPerSet && exLog.repsPerSet.length > 0 ? Math.max(...exLog.repsPerSet) : null;
    const achievedAt = new Date();
    const valueFields = valueFieldsFor(recordType, value, contextReps);

    if (!currentPR) {
      await db.insert(personalRecordsTable).values({
        userId,
        exerciseId: exLog.exerciseId,
        recordType,
        ...valueFields,
        sessionLogId,
        achievedAt,
      });
    } else {
      await db.update(personalRecordsTable)
        .set({ recordType, ...valueFields, ...previousFieldsFor(recordType, currentPR), achievedAt, sessionLogId })
        .where(and(eq(personalRecordsTable.userId, userId), eq(personalRecordsTable.exerciseId, exLog.exerciseId)));
    }

    await db.insert(prHistoryTable).values({
      userId,
      exerciseId: exLog.exerciseId,
      recordType,
      ...valueFields,
      sessionLogId,
      achievedAt,
    });

    newPRs.push({
      exerciseId: exLog.exerciseId,
      exerciseName: exercise.name,
      recordType,
      value,
      previousValue: currentValue,
      isFirst: !currentPR,
    });
  }

  return newPRs;
}

export interface AthletePR {
  recordType: RecordType;
  value: number;
}

export async function getAthleteCurrentPRs(userId: string): Promise<Record<string, AthletePR>> {
  const prs = await db.select().from(personalRecordsTable).where(eq(personalRecordsTable.userId, userId));

  const result: Record<string, AthletePR> = {};
  for (const pr of prs) {
    const recordType = pr.recordType as RecordType;
    const value = currentValueOf(recordType, pr);
    if (value === null) continue;
    result[pr.exerciseId] = { recordType, value };
  }
  return result;
}
