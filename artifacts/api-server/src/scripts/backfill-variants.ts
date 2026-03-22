/**
 * Backfill script: generate PERF/ADAPT/RECOVERY variants for sessions
 * that only have the "normal" variant.
 *
 * Run once: pnpm --filter @workspace/api-server tsx src/scripts/backfill-variants.ts
 * Idempotent: skips sessions that already have all 4 variants.
 */

import { db } from "@workspace/db";
import {
  sessionsTable,
  sessionVariantsTable,
  sessionExercisesTable,
} from "@workspace/db";
import { eq, and, notInArray } from "drizzle-orm";

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

interface ExerciseInput {
  exerciseId: string;
  orderIndex: number;
  sets: number;
  reps?: string;
  loadKg?: number | null;
  restSeconds?: number | null;
  coachCue?: string | null;
}

function buildAutoVariants(normalExercises: ExerciseInput[]) {
  return [
    {
      mode: "performance" as const,
      notes: "Auto-généré: charge ×1.05",
      volumeModifier: "1.0",
      intensityModifier: "1.05",
      exercises: normalExercises.map((ex) => ({
        ...ex,
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 1.05) : ex.loadKg,
      })),
    },
    {
      mode: "adapt" as const,
      notes: "Auto-généré: charge ×0.75, séries -1",
      volumeModifier: "0.9",
      intensityModifier: "0.75",
      exercises: normalExercises.map((ex) => ({
        ...ex,
        sets: Math.max(2, (ex.sets ?? 3) - 1),
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 0.75) : ex.loadKg,
      })),
    },
    {
      mode: "recovery" as const,
      notes: "Auto-généré: charge ×0.30, 2 séries",
      volumeModifier: "0.5",
      intensityModifier: "0.30",
      exercises: normalExercises.map((ex) => ({
        ...ex,
        sets: 2,
        reps: "12-15",
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 0.30) : ex.loadKg,
        restSeconds: 60,
        coachCue: "Mobilité et contrôle",
      })),
    },
  ];
}

async function main() {
  console.log("🔧 Backfill: génération des variantes manquantes…");

  const allSessions = await db.select({ id: sessionsTable.id }).from(sessionsTable);
  let created = 0;
  let skipped = 0;

  for (const session of allSessions) {
    const variants = await db
      .select({ id: sessionVariantsTable.id, mode: sessionVariantsTable.mode })
      .from(sessionVariantsTable)
      .where(eq(sessionVariantsTable.sessionId, session.id));

    const existingModes = new Set(variants.map((v) => v.mode));

    if (
      existingModes.has("performance") &&
      existingModes.has("adapt") &&
      existingModes.has("recovery")
    ) {
      skipped++;
      continue;
    }

    const normalVariant = variants.find((v) => v.mode === "normal");
    if (!normalVariant) {
      console.warn(`  ⚠️  Session ${session.id}: pas de variante normale, ignorée`);
      skipped++;
      continue;
    }

    const rawExercises = await db
      .select({
        exerciseId: sessionExercisesTable.exerciseId,
        orderIndex: sessionExercisesTable.orderIndex,
        sets: sessionExercisesTable.sets,
        reps: sessionExercisesTable.reps,
        loadKg: sessionExercisesTable.loadKg,
        restSeconds: sessionExercisesTable.restSeconds,
        coachCue: sessionExercisesTable.coachCue,
      })
      .from(sessionExercisesTable)
      .where(eq(sessionExercisesTable.variantId, normalVariant.id));

    const normalExercises: ExerciseInput[] = rawExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      orderIndex: ex.orderIndex,
      sets: ex.sets ?? 3,
      reps: ex.reps ?? undefined,
      loadKg: ex.loadKg != null ? parseFloat(ex.loadKg) : null,
      restSeconds: ex.restSeconds ?? null,
      coachCue: ex.coachCue ?? null,
    }));

    const autoVariants = buildAutoVariants(normalExercises);

    for (const av of autoVariants) {
      if (existingModes.has(av.mode)) continue;

      const [sv] = await db
        .insert(sessionVariantsTable)
        .values({
          sessionId: session.id,
          mode: av.mode,
          notes: av.notes,
          volumeModifier: av.volumeModifier,
          intensityModifier: av.intensityModifier,
        })
        .returning();

      for (const ex of av.exercises) {
        await db.insert(sessionExercisesTable).values({
          variantId: sv.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          sets: ex.sets,
          reps: ex.reps,
          loadKg: ex.loadKg != null ? String(ex.loadKg) : undefined,
          restSeconds: ex.restSeconds ?? undefined,
          coachCue: ex.coachCue ?? undefined,
        });
      }

      created++;
      console.log(`  ✅ Session ${session.id}: variante ${av.mode} créée`);
    }
  }

  console.log(`\nTerminé — ${created} variante(s) créée(s), ${skipped} session(s) ignorée(s)`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
