/**
 * Backfill script: seed pr_history from existing personal_records rows.
 *
 * For each personal_records row:
 *   1. Insert the current PR (loadKg + achievedAt) into pr_history if not already present.
 *   2. If previousLoadKg is set, also insert an older synthetic entry
 *      (previousLoadKg, achievedAt - 1 day) so athletes see at least 2 data points.
 *
 * Idempotent: fetches all existing pr_history keys in one query, then skips any
 * candidate that already exists. Safe to run multiple times.
 *
 * Run standalone: pnpm --filter @workspace/api-server tsx src/scripts/backfill-pr-history.ts
 * Also called automatically from seed-prod.ts during deployment.
 */

import { db } from "@workspace/db";
import { personalRecordsTable, prHistoryTable } from "@workspace/db";

type HistoryRow = {
  userId: string;
  exerciseId: string;
  loadKg: string;
  reps: number;
  achievedAt: Date;
  sessionLogId?: string;
};

function makeKey(userId: string, exerciseId: string, loadKg: string, reps: number, achievedAt: Date): string {
  return `${userId}|${exerciseId}|${loadKg}|${reps}|${achievedAt.getTime()}`;
}

export async function backfillPrHistory(): Promise<{ inserted: number; skipped: number }> {
  const [records, existingHistory] = await Promise.all([
    db.select().from(personalRecordsTable),
    db
      .select({
        userId: prHistoryTable.userId,
        exerciseId: prHistoryTable.exerciseId,
        loadKg: prHistoryTable.loadKg,
        reps: prHistoryTable.reps,
        achievedAt: prHistoryTable.achievedAt,
      })
      .from(prHistoryTable),
  ]);

  // Same load-only scope as the records loop below — non-load history rows
  // (bodyweight/time/distance) can't collide with a load-type key anyway.
  const existingKeys = new Set(
    existingHistory
      .filter((h): h is typeof h & { loadKg: string; reps: number } => h.loadKg != null && h.reps != null)
      .map((h) => makeKey(h.userId, h.exerciseId, h.loadKg, h.reps, h.achievedAt))
  );

  const toInsert: HistoryRow[] = [];
  let skipped = 0;

  for (const record of records) {
    const { userId, exerciseId, loadKg, reps, achievedAt, sessionLogId, previousLoadKg } = record;
    // This backfill predates generalized PR types and only ever seeded
    // load-based PRs — skip anything without a load value (bodyweight/time/
    // distance records, which never have loadKg set).
    if (loadKg == null || reps == null) continue;

    // --- Entry 1: the current PR ---
    const currentKey = makeKey(userId, exerciseId, loadKg, reps, achievedAt);
    if (existingKeys.has(currentKey)) {
      skipped++;
    } else {
      existingKeys.add(currentKey);
      toInsert.push({ userId, exerciseId, loadKg, reps, achievedAt, sessionLogId: sessionLogId ?? undefined });
    }

    // --- Entry 2: the previous PR (if available) ---
    if (previousLoadKg != null) {
      const prevAchievedAt = new Date(achievedAt.getTime() - 24 * 60 * 60 * 1000);
      const prevKey = makeKey(userId, exerciseId, previousLoadKg, reps, prevAchievedAt);
      if (existingKeys.has(prevKey)) {
        skipped++;
      } else {
        existingKeys.add(prevKey);
        toInsert.push({ userId, exerciseId, loadKg: previousLoadKg, reps, achievedAt: prevAchievedAt });
      }
    }
  }

  if (toInsert.length === 0) {
    return { inserted: 0, skipped };
  }

  // Batch insert in chunks to avoid hitting parameter limits
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(prHistoryTable).values(chunk);
    inserted += chunk.length;
  }

  return { inserted, skipped };
}

// Allow running as a standalone script
if (process.argv[1]?.endsWith("backfill-pr-history.ts") || process.argv[1]?.endsWith("backfill-pr-history.js")) {
  console.log("🔧 Backfill: seeding pr_history from personal_records…");
  backfillPrHistory()
    .then(({ inserted, skipped }) => {
      console.log(`\nTerminé — ${inserted} entrée(s) insérée(s), ${skipped} déjà présente(s)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erreur:", err);
      process.exit(1);
    });
}
