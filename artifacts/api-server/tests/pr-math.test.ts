/**
 * Unit tests: generalized PR detection pure logic.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/pr-math.test.ts
 *
 * No database needed — src/lib/pr-math.ts has zero imports.
 */

import { recordTypeForTracking, pickLoggedMetric, isNewRecord } from "../src/lib/pr-math.js";

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("\nGeneralized PR Detection Unit Tests\n");

  test("recordTypeForTracking: bodyweight tracks reps, not 'bodyweight' itself", () => {
    if (recordTypeForTracking("bodyweight") !== "reps") throw new Error("expected 'reps'");
  });

  test("recordTypeForTracking: time and distance pass through unchanged", () => {
    if (recordTypeForTracking("time") !== "time") throw new Error("expected 'time'");
    if (recordTypeForTracking("distance") !== "distance") throw new Error("expected 'distance'");
  });

  test("recordTypeForTracking: load and unknown values both fall back to 'load'", () => {
    if (recordTypeForTracking("load") !== "load") throw new Error("expected 'load'");
    if (recordTypeForTracking("something-unrecognized") !== "load") throw new Error("expected fallback to 'load'");
  });

  test("pickLoggedMetric: load with no weight logged is skipped, not treated as a 0kg PR", () => {
    if (pickLoggedMetric("load", {}) !== null) throw new Error("expected null with no loadKgUsed");
    if (pickLoggedMetric("load", { loadKgUsed: 0 }) !== null) throw new Error("expected null for 0kg (still a bodyweight-exclusion-equivalent gate)");
  });

  test("pickLoggedMetric: load returns the logged value when positive", () => {
    if (pickLoggedMetric("load", { loadKgUsed: 82.5 }) !== 82.5) throw new Error("expected 82.5");
  });

  test("pickLoggedMetric: reps picks the BEST set across the session, not the first", () => {
    const result = pickLoggedMetric("reps", { repsPerSet: [8, 12, 10] });
    if (result !== 12) throw new Error(`expected max(8,12,10)=12, got ${result}`);
  });

  test("pickLoggedMetric: reps with an empty or missing rep list is skipped", () => {
    if (pickLoggedMetric("reps", { repsPerSet: [] }) !== null) throw new Error("expected null for empty array");
    if (pickLoggedMetric("reps", {}) !== null) throw new Error("expected null for missing repsPerSet");
  });

  test("pickLoggedMetric: time and distance read their own dedicated fields", () => {
    if (pickLoggedMetric("time", { durationSecondsUsed: 45 }) !== 45) throw new Error("expected 45");
    if (pickLoggedMetric("time", {}) !== null) throw new Error("expected null with nothing logged");
    if (pickLoggedMetric("distance", { distanceMetersUsed: 400 }) !== 400) throw new Error("expected 400");
    if (pickLoggedMetric("distance", {}) !== null) throw new Error("expected null with nothing logged");
  });

  test("isNewRecord: no existing PR is always a new record (isFirst case)", () => {
    if (!isNewRecord("load", 1, null)) throw new Error("expected true — nothing to beat yet");
    if (!isNewRecord("time", 999, null)) throw new Error("expected true — nothing to beat yet");
  });

  test("isNewRecord: load/reps/distance are all 'higher is better'", () => {
    if (!isNewRecord("load", 101, 100)) throw new Error("expected 101kg to beat 100kg");
    if (isNewRecord("load", 99, 100)) throw new Error("expected 99kg NOT to beat 100kg");
    if (!isNewRecord("reps", 13, 12)) throw new Error("expected 13 reps to beat 12");
    if (!isNewRecord("distance", 401, 400)) throw new Error("expected 401m to beat 400m");
  });

  test("isNewRecord: time is 'LOWER is better' — the one inverted case, and the easiest to get backwards", () => {
    if (!isNewRecord("time", 44, 45)) throw new Error("expected 44s to beat 45s (faster)");
    if (isNewRecord("time", 46, 45)) throw new Error("expected 46s NOT to beat 45s (slower)");
  });

  test("isNewRecord: an exactly equal value is never a new record, for any type", () => {
    if (isNewRecord("load", 100, 100)) throw new Error("equal load should not count as a new PR");
    if (isNewRecord("time", 45, 45)) throw new Error("equal time should not count as a new PR");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
