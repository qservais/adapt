/**
 * Unit tests: credit ledger allocation + promo-expiry pure logic.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/credit-ledger.test.ts
 *
 * No database needed — src/lib/ledger-math.ts is a dependency-free module by
 * design specifically so the client's "no gaps, no double-spend, no
 * cosmetic-only promo expiry" requirements can be checked without spinning up
 * Postgres or Stripe.
 */

import { allocateFifo, isPromoActive, type Allocatable } from "../src/lib/ledger-math.js";

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

  function assertEqual<T>(actual: T, expected: T, label: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  console.log("\nCredit Ledger Unit Tests\n");

  test("allocateFifo: single batch covers the full request", () => {
    const batches: Allocatable[] = [{ id: "b1", creditsRemaining: 10 }];
    const { allocations, shortfall } = allocateFifo(batches, 4);
    assertEqual(allocations, [{ id: "b1", take: 4 }], "allocations");
    assertEqual(shortfall, 0, "shortfall");
  });

  test("allocateFifo: spends the soonest-expiry batch first, spills into the next", () => {
    // Caller is responsible for sorting soonest-expiry-first before calling —
    // this confirms the allocator respects array order, not batch size.
    const batches: Allocatable[] = [
      { id: "expires-soon", creditsRemaining: 2 },
      { id: "expires-later", creditsRemaining: 10 },
    ];
    const { allocations, shortfall } = allocateFifo(batches, 5);
    assertEqual(allocations, [
      { id: "expires-soon", take: 2 },
      { id: "expires-later", take: 3 },
    ], "allocations");
    assertEqual(shortfall, 0, "shortfall");
  });

  test("allocateFifo: insufficient total balance reports the exact shortfall", () => {
    const batches: Allocatable[] = [{ id: "b1", creditsRemaining: 2 }];
    const { allocations, shortfall } = allocateFifo(batches, 5);
    assertEqual(allocations, [{ id: "b1", take: 2 }], "allocations");
    assertEqual(shortfall, 3, "shortfall");
  });

  test("allocateFifo: zero balance and zero request are both no-ops, not errors", () => {
    assertEqual(allocateFifo([], 0), { allocations: [], shortfall: 0 }, "empty/zero");
    assertEqual(allocateFifo([], 3), { allocations: [], shortfall: 3 }, "empty batches, nonzero request");
  });

  test("allocateFifo: never allocates more than a batch actually has", () => {
    const batches: Allocatable[] = [{ id: "b1", creditsRemaining: 3 }];
    const { allocations } = allocateFifo(batches, 100);
    if (allocations[0]!.take > 3) throw new Error("allocated more than the batch's remaining balance");
  });

  test("isPromoActive: true strictly inside the window", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const promo = { startsAt: new Date("2026-07-10T00:00:00Z"), expiresAt: new Date("2026-07-20T00:00:00Z") };
    if (!isPromoActive(promo, now)) throw new Error("expected active");
  });

  test("isPromoActive: false once now has reached expiresAt (half-open interval)", () => {
    const expiresAt = new Date("2026-07-20T00:00:00Z");
    const promo = { startsAt: new Date("2026-07-10T00:00:00Z"), expiresAt };
    if (isPromoActive(promo, expiresAt)) throw new Error("expected inactive exactly at expiresAt — this is the mockup's cosmetic-only-expiry bug");
    if (!isPromoActive(promo, new Date(expiresAt.getTime() - 1))) throw new Error("expected active 1ms before expiresAt");
  });

  test("isPromoActive: false before startsAt", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    const promo = { startsAt: new Date("2026-07-10T00:00:00Z"), expiresAt: new Date("2026-07-20T00:00:00Z") };
    if (isPromoActive(promo, now)) throw new Error("expected inactive before start");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
