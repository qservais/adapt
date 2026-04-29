import { db } from "@workspace/db";
import {
  sessionBlocksTable,
  sessionVariantsTable,
  sessionExercisesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function runBlockMigration(): Promise<void> {
  try {
    // Find all session_ids that have variants (with exercises) but no session_blocks row.
    const allVariantRows = await db
      .select({ sessionId: sessionVariantsTable.sessionId })
      .from(sessionVariantsTable);

    const allSessionIds = [...new Set(allVariantRows.map(r => r.sessionId))];

    if (allSessionIds.length === 0) {
      logger.info("Block migration: no sessions found, skipping");
      return;
    }

    // Sessions that already have blocks — skip those.
    const alreadyHaveBlocks = await db
      .select({ sessionId: sessionBlocksTable.sessionId })
      .from(sessionBlocksTable)
      .where(inArray(sessionBlocksTable.sessionId, allSessionIds));

    const blockedSessionIds = new Set(alreadyHaveBlocks.map(r => r.sessionId));
    const sessionsToProcess = allSessionIds.filter(id => !blockedSessionIds.has(id));

    if (sessionsToProcess.length === 0) {
      logger.info("Block migration: all sessions already have blocks, skipping");
      return;
    }

    let blocksCreated = 0;
    let exercisesUpdated = 0;

    for (const sessionId of sessionsToProcess) {
      await db.transaction(async (tx) => {
        // Insert a single default block for this session.
        const [newBlock] = await tx
          .insert(sessionBlocksTable)
          .values({
            sessionId,
            type: "strength",
            orderIndex: 0,
            name: null,
          })
          .returning({ id: sessionBlocksTable.id });

        if (!newBlock) return;
        blocksCreated++;

        // Get all variant IDs for this session.
        const variants = await tx
          .select({ id: sessionVariantsTable.id })
          .from(sessionVariantsTable)
          .where(eq(sessionVariantsTable.sessionId, sessionId));

        const variantIds = variants.map(v => v.id);
        if (variantIds.length === 0) return;

        // Update all exercises for these variants that have no block_id.
        const updated = await tx
          .update(sessionExercisesTable)
          .set({ blockId: newBlock.id })
          .where(inArray(sessionExercisesTable.variantId, variantIds))
          .returning({ id: sessionExercisesTable.id });

        exercisesUpdated += updated.length;
      });
    }

    logger.info(
      {
        sessionsProcessed: sessionsToProcess.length,
        blocksCreated,
        exercisesUpdated,
      },
      `Block migration: ${sessionsToProcess.length} sessions processed, ${blocksCreated} blocks created, ${exercisesUpdated} exercises updated`
    );
  } catch (err) {
    logger.error({ err }, "Block migration: error during migration (non-fatal)");
  }
}
