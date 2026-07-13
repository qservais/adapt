import { db } from "@workspace/db";
import { personalRecordsTable, prHistoryTable, exercisesTable, exerciseLogsTable, sessionLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export interface NewPR {
  exerciseId: string;
  exerciseName: string;
  newLoadKg: number;
  previousLoadKg: number | null;
  isFirst: boolean;
}

interface ExerciseLogInput {
  exerciseId: string;
  setsCompleted?: number;
  repsPerSet?: number[];
  loadKgUsed?: number;
}

async function getExerciseName(exerciseId: string): Promise<string> {
  const [ex] = await db.select({ name: exercisesTable.name })
    .from(exercisesTable)
    .where(eq(exercisesTable.id, exerciseId));
  return ex?.name ?? "Exercice inconnu";
}

export async function detectNewPRs(
  userId: string,
  sessionLogId: string,
  exercisesLog: ExerciseLogInput[]
): Promise<NewPR[]> {
  const newPRs: NewPR[] = [];

  for (const exLog of exercisesLog) {
    if (!exLog.loadKgUsed || exLog.loadKgUsed <= 0) continue;

    const [currentPR] = await db.select({
      id: personalRecordsTable.id,
      loadKg: personalRecordsTable.loadKg,
    })
      .from(personalRecordsTable)
      .where(and(
        eq(personalRecordsTable.userId, userId),
        eq(personalRecordsTable.exerciseId, exLog.exerciseId)
      ));

    const firstRep = exLog.repsPerSet?.[0] ?? 0;

    if (!currentPR) {
      const achievedAt = new Date();
      await db.insert(personalRecordsTable).values({
        userId,
        exerciseId: exLog.exerciseId,
        loadKg: exLog.loadKgUsed.toString(),
        reps: firstRep,
        sessionLogId,
        achievedAt,
      });
      await db.insert(prHistoryTable).values({
        userId,
        exerciseId: exLog.exerciseId,
        loadKg: exLog.loadKgUsed.toString(),
        reps: firstRep,
        sessionLogId,
        achievedAt,
      });
      const exerciseName = await getExerciseName(exLog.exerciseId);
      newPRs.push({
        exerciseId: exLog.exerciseId,
        exerciseName,
        newLoadKg: exLog.loadKgUsed,
        previousLoadKg: null,
        isFirst: true,
      });
    } else if (exLog.loadKgUsed > parseFloat(currentPR.loadKg)) {
      const previousLoad = parseFloat(currentPR.loadKg);
      const achievedAt = new Date();
      await db.update(personalRecordsTable)
        .set({
          loadKg: exLog.loadKgUsed.toString(),
          reps: firstRep,
          previousLoadKg: previousLoad.toString(),
          achievedAt,
          sessionLogId,
        })
        .where(and(
          eq(personalRecordsTable.userId, userId),
          eq(personalRecordsTable.exerciseId, exLog.exerciseId)
        ));
      await db.insert(prHistoryTable).values({
        userId,
        exerciseId: exLog.exerciseId,
        loadKg: exLog.loadKgUsed.toString(),
        reps: firstRep,
        sessionLogId,
        achievedAt,
      });
      const exerciseName = await getExerciseName(exLog.exerciseId);
      newPRs.push({
        exerciseId: exLog.exerciseId,
        exerciseName,
        newLoadKg: exLog.loadKgUsed,
        previousLoadKg: previousLoad,
        isFirst: false,
      });
    }
  }

  return newPRs;
}

export async function getAthleteCurrentPRs(userId: string): Promise<Record<string, number>> {
  const prs = await db.select({
    exerciseId: personalRecordsTable.exerciseId,
    loadKg: personalRecordsTable.loadKg,
  })
    .from(personalRecordsTable)
    .where(eq(personalRecordsTable.userId, userId));

  const result: Record<string, number> = {};
  for (const pr of prs) {
    result[pr.exerciseId] = parseFloat(pr.loadKg);
  }
  return result;
}
