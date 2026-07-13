/**
 * Unit tests: calendar date placement pure logic.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/date-utils.test.ts
 *
 * No database needed — src/lib/dateUtils.ts has zero imports.
 */

import { computeSessionDate, computeWeekDayFromDate, dateDiffDays } from "../src/lib/dateUtils.js";

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

  console.log("\nCalendar Date Placement Unit Tests\n");

  test("computeWeekDayFromDate is the exact inverse of computeSessionDate, for every weekday a programme could start on", () => {
    // 2026-07-13 is a Monday; walk through all 7 possible start weekdays.
    for (let offset = 0; offset < 7; offset++) {
      const startMs = new Date("2026-07-13T12:00:00Z").getTime() + offset * 86400000;
      const programStart = new Date(startMs).toISOString().split("T")[0]!;
      for (let week = 1; week <= 6; week++) {
        for (let day = 1; day <= 7; day++) {
          const date = computeSessionDate(programStart, week, day);
          const back = computeWeekDayFromDate(programStart, date);
          if (back.weekNumber !== week || back.dayNumber !== day) {
            throw new Error(`programStart=${programStart} week=${week} day=${day} -> date=${date} -> back={week:${back.weekNumber},day:${back.dayNumber}}`);
          }
        }
      }
    }
  });

  test("computeWeekDayFromDate: a Monday programme start maps day 1 of week 1 to the start date itself", () => {
    const result = computeWeekDayFromDate("2026-07-13", "2026-07-13");
    if (result.weekNumber !== 1 || result.dayNumber !== 1) throw new Error(`expected {week:1,day:1}, got ${JSON.stringify(result)}`);
  });

  test("computeWeekDayFromDate: a date before the programme's week-1 Monday reports week <= 0 rather than throwing", () => {
    // Programme starts mid-week (Wednesday); the Monday before week 1 starts is out of range.
    const result = computeWeekDayFromDate("2026-07-15", "2026-07-06"); // 2026-07-15 is a Wednesday
    if (result.weekNumber >= 1) throw new Error(`expected a week before the programme (<=0), got ${JSON.stringify(result)}`);
    // And it must still round-trip back to the same date via the forward function.
    const forward = computeSessionDate("2026-07-15", result.weekNumber, result.dayNumber);
    if (forward !== "2026-07-06") throw new Error(`round-trip failed: got ${forward}`);
  });

  test("dateDiffDays sanity check backing the inverse function", () => {
    if (dateDiffDays("2026-07-13", "2026-07-20") !== 7) throw new Error("expected 7 days between the two Mondays");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
