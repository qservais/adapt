import { db } from "@workspace/db";
import { programsTable, sessionsTable, sessionBlocksTable, sessionVariantsTable, sessionExercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

interface SourceProgram {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
}

interface CopyProgramParams {
  coachId: string;
  athleteId: string;
  startDate?: string;
}

// Copies a template/source programme (sessions → blocks → variants →
// exercises) into a brand-new non-template programme owned by one athlete.
// Pass a `tx` so the whole copy commits or rolls back atomically — a crash
// partway through must never leave a half-built programme visible to the
// athlete. Used by the template "apply", "duplicate-for-athlete", and
// "send-to-athletes" routes, which previously each hand-rolled this same
// nested insert loop non-transactionally.
export async function copyProgramForAthlete(
  executor: Executor,
  sourceProgram: SourceProgram,
  params: CopyProgramParams,
) {
  const [newProgram] = await executor.insert(programsTable).values({
    coachId: params.coachId,
    athleteId: params.athleteId,
    name: sourceProgram.name,
    description: sourceProgram.description,
    durationWeeks: sourceProgram.durationWeeks,
    startDate: params.startDate,
    isTemplate: false,
  }).returning();

  const sourceSessions = await executor.select().from(sessionsTable)
    .where(eq(sessionsTable.programId, sourceProgram.id))
    .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

  for (const session of sourceSessions) {
    const [newSession] = await executor.insert(sessionsTable).values({
      programId: newProgram!.id,
      weekNumber: session.weekNumber,
      dayNumber: session.dayNumber,
      name: session.name,
      type: session.type,
      sessionType: session.sessionType,
      scheduledTime: session.scheduledTime,
      visioLink: session.visioLink,
      estimatedDurationMin: session.estimatedDurationMin,
      coachNotes: session.coachNotes,
    }).returning();

    const sourceBlocks = await executor.select().from(sessionBlocksTable)
      .where(eq(sessionBlocksTable.sessionId, session.id))
      .orderBy(sessionBlocksTable.orderIndex);

    const blockIdMap = new Map<string, string>();
    for (const block of sourceBlocks) {
      const [newBlock] = await executor.insert(sessionBlocksTable).values({
        sessionId: newSession!.id,
        type: block.type,
        orderIndex: block.orderIndex,
        name: block.name,
        notes: block.notes,
        estimatedDurationMin: block.estimatedDurationMin,
        conditioningFormat: block.conditioningFormat,
      }).returning();
      blockIdMap.set(block.id, newBlock!.id);
    }

    const sourceVariants = await executor.select().from(sessionVariantsTable)
      .where(eq(sessionVariantsTable.sessionId, session.id));

    for (const variant of sourceVariants) {
      const [newVariant] = await executor.insert(sessionVariantsTable).values({
        sessionId: newSession!.id,
        mode: variant.mode,
        volumeModifier: variant.volumeModifier,
        intensityModifier: variant.intensityModifier,
        notes: variant.notes,
      }).returning();

      const sourceExercises = await executor.select().from(sessionExercisesTable)
        .where(eq(sessionExercisesTable.variantId, variant.id))
        .orderBy(sessionExercisesTable.orderIndex);

      for (const ex of sourceExercises) {
        await executor.insert(sessionExercisesTable).values({
          variantId: newVariant!.id,
          blockId: ex.blockId ? (blockIdMap.get(ex.blockId) ?? null) : null,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          sets: ex.sets,
          reps: ex.reps,
          loadKg: ex.loadKg,
          restSeconds: ex.restSeconds,
          coachCue: ex.coachCue,
          tempo: ex.tempo,
          supersetGroup: ex.supersetGroup,
          supersetLabel: ex.supersetLabel,
        });
      }
    }
  }

  return newProgram!;
}
