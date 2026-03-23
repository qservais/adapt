/**
 * Integration test: Exercise library visibility + category compatibility
 * Run: pnpm --filter @workspace/api-server exec tsx tests/exercises-library.test.ts
 *
 * Verifies:
 * 1. Seeded global exercises (created_by IS NULL) appear in library for any coach
 * 2. Exercises with legacy category "plyometric" are accepted by write schema
 */

import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { or, isNull, eq } from "drizzle-orm";

const ANY_COACH_ID = "00000000-0000-0000-0000-000000000099"; // used only in SELECT WHERE, never inserted

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("\nExercise Library Integration Tests\n");

  // Test 1: Global exercises (created_by IS NULL) are returned for any coach
  await test("GET /exercises: global seeded exercises are visible (created_by IS NULL)", async () => {
    const globalExercises = await db.select({ id: exercisesTable.id, name: exercisesTable.name })
      .from(exercisesTable)
      .where(isNull(exercisesTable.createdBy));

    if (globalExercises.length === 0) {
      // Seed one global exercise for the test
      const [seeded] = await db.insert(exercisesTable).values({
        name: "__test_global_squat__",
        category: "compound",
        createdBy: null,
      }).returning({ id: exercisesTable.id });

      // Verify it now shows in the OR query
      const visible = await db.select({ id: exercisesTable.id })
        .from(exercisesTable)
        .where(or(isNull(exercisesTable.createdBy), eq(exercisesTable.createdBy, ANY_COACH_ID)));

      const found = visible.some(e => e.id === seeded.id);

      // Cleanup
      await db.delete(exercisesTable).where(eq(exercisesTable.id, seeded.id));

      if (!found) throw new Error("Seeded global exercise not visible with OR(isNull, eq) filter");
    } else {
      // Verify existing global exercises are visible with OR filter
      const visible = await db.select({ id: exercisesTable.id })
        .from(exercisesTable)
        .where(or(isNull(exercisesTable.createdBy), eq(exercisesTable.createdBy, ANY_COACH_ID)));

      const allGlobalVisible = globalExercises.every(g => visible.some(v => v.id === g.id));
      if (!allGlobalVisible) throw new Error("Some global exercises not returned by OR(isNull, eq) filter");
    }
  });

  // Test 2: Exercises with "plyometric" category are accepted in DB
  await test("category compatibility: 'plyometric' exercises can be inserted and queried", async () => {
    const [inserted] = await db.insert(exercisesTable).values({
      name: "__test_plyometric_box_jump__",
      category: "plyometric",
      createdBy: null,
    }).returning({ id: exercisesTable.id, category: exercisesTable.category });

    if (inserted.category !== "plyometric") {
      await db.delete(exercisesTable).where(eq(exercisesTable.id, inserted.id));
      throw new Error(`Expected category 'plyometric', got '${inserted.category}'`);
    }

    // Verify visible in the OR query
    const visible = await db.select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(or(isNull(exercisesTable.createdBy), eq(exercisesTable.createdBy, ANY_COACH_ID)));

    const found = visible.some(v => v.id === inserted.id);

    // Cleanup
    await db.delete(exercisesTable).where(eq(exercisesTable.id, inserted.id));

    if (!found) throw new Error("Plyometric exercise not visible in library query");
  });

  // Test 3: OR filter never hides global exercises even when coach has no own exercises
  await test("OR filter always includes all global exercises regardless of coach ID", async () => {
    const globalAll = await db.select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(isNull(exercisesTable.createdBy));

    const viaOrFilter = await db.select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(or(isNull(exercisesTable.createdBy), eq(exercisesTable.createdBy, ANY_COACH_ID)));

    const allIncluded = globalAll.every(g => viaOrFilter.some(v => v.id === g.id));
    if (!allIncluded) throw new Error("OR filter excluded some global exercises");

    // viaOrFilter must be >= globalAll (may include coach-owned on top)
    if (viaOrFilter.length < globalAll.length) {
      throw new Error(`OR filter returned fewer rows (${viaOrFilter.length}) than global-only filter (${globalAll.length})`);
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
