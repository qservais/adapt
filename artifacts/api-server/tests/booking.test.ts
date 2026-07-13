/**
 * Unit tests: booking/cancellation pure logic.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/booking.test.ts
 *
 * No database needed — src/lib/cancellation-math.ts has zero imports.
 */

import { isLateCancellation } from "../src/lib/cancellation-math.js";

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

  console.log("\nBooking/Cancellation Unit Tests\n");

  test("isLateCancellation: well outside the window is not late (credit refunded)", () => {
    const now = new Date("2026-07-13T10:00:00Z");
    const classStart = new Date("2026-07-15T10:00:00Z"); // 48h out
    if (isLateCancellation(classStart, now, 24)) throw new Error("expected not late (48h > 24h window)");
  });

  test("isLateCancellation: well inside the window is late (credit kept)", () => {
    const now = new Date("2026-07-13T10:00:00Z");
    const classStart = new Date("2026-07-13T20:00:00Z"); // 10h out
    if (!isLateCancellation(classStart, now, 24)) throw new Error("expected late (10h < 24h window)");
  });

  test("isLateCancellation: exactly at the boundary counts as late ('dans les X heures' is inclusive)", () => {
    const now = new Date("2026-07-13T10:00:00Z");
    const classStart = new Date("2026-07-14T10:00:00Z"); // exactly 24h out
    if (!isLateCancellation(classStart, now, 24)) throw new Error("expected late exactly at the 24h boundary");
  });

  test("isLateCancellation: 1 minute past the boundary is not late", () => {
    const now = new Date("2026-07-13T10:00:00Z");
    const classStart = new Date("2026-07-14T10:01:00Z"); // 24h01m out
    if (isLateCancellation(classStart, now, 24)) throw new Error("expected not late just past the boundary");
  });

  test("isLateCancellation: cancelling after the class already started is always late", () => {
    const now = new Date("2026-07-13T11:00:00Z");
    const classStart = new Date("2026-07-13T10:00:00Z"); // already started
    if (!isLateCancellation(classStart, now, 24)) throw new Error("expected late — class already started");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
