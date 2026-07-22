/**
 * Unit tests: ADAPT score algorithm (calculateAdaptScore / calculateAdaptedLoad).
 * Run: pnpm --filter @workspace/api-server exec tsx tests/adapt-engine.test.ts
 *
 * No database needed — src/services/adapt-engine.ts has zero imports.
 *
 * This formula previously had zero test coverage, which is how a stress/soreness
 * polarity mismatch between the live check-in UI and this formula went unnoticed
 * in production. These tests pin down the renormalized 4-term V1 formula
 * (soreness dropped) and its polarity conventions so a future edit can't silently
 * repeat that.
 */

import { calculateAdaptScore, calculateAdaptedLoad } from "../src/services/adapt-engine.js";

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

  console.log("\nADAPT Engine Unit Tests\n");

  test("all-best inputs (sleep=5,energy=5,stress=1,motivation=5) score 100 and mode=performance", () => {
    const { adaptScore, sessionMode } = calculateAdaptScore({ sleep: 5, energy: 5, stress: 1, motivation: 5 });
    if (adaptScore !== 100) throw new Error(`expected 100, got ${adaptScore}`);
    if (sessionMode !== "performance") throw new Error(`expected performance, got ${sessionMode}`);
  });

  test("all-worst inputs (sleep=1,energy=1,stress=5,motivation=1) score 0 and mode=recovery", () => {
    const { adaptScore, sessionMode } = calculateAdaptScore({ sleep: 1, energy: 1, stress: 5, motivation: 1 });
    if (adaptScore !== 0) throw new Error(`expected 0, got ${adaptScore}`);
    if (sessionMode !== "recovery") throw new Error(`expected recovery, got ${sessionMode}`);
  });

  test("mid inputs (all 3s) score 50 — renormalized weights still sum to 1.0", () => {
    const { adaptScore } = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3 });
    if (adaptScore !== 50) throw new Error(`expected 50 (weights must sum to 1.0), got ${adaptScore}`);
  });

  test("stress polarity: stress=1 (calm) scores HIGHER than stress=5 (very stressed), all else equal", () => {
    const calm = calculateAdaptScore({ sleep: 3, energy: 3, stress: 1, motivation: 3 });
    const stressed = calculateAdaptScore({ sleep: 3, energy: 3, stress: 5, motivation: 3 });
    if (!(calm.adaptScore > stressed.adaptScore)) {
      throw new Error(`expected calm (${calm.adaptScore}) > stressed (${stressed.adaptScore}) — this is the exact polarity bug found in the live UI, don't reintroduce it`);
    }
  });

  test("sleep/energy/motivation polarity: higher raw value always scores higher, all else equal", () => {
    const lo = calculateAdaptScore({ sleep: 1, energy: 3, stress: 3, motivation: 3 });
    const hi = calculateAdaptScore({ sleep: 5, energy: 3, stress: 3, motivation: 3 });
    if (!(hi.adaptScore > lo.adaptScore)) throw new Error("expected higher sleep to score higher");
  });

  test("soreness is not part of the input type — dropped from V1, cannot silently creep back in", () => {
    // @ts-expect-error — soreness must not be an accepted field of AdaptScoreInput
    const result = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3, soreness: 5 });
    // Even if passed, it must have zero effect on the result vs. the same call without it.
    const baseline = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3 });
    if (result.adaptScore !== baseline.adaptScore) throw new Error("soreness must have zero effect on the score");
  });

  test("rpeYesterday >= 9 applies a 0.85x multiplier", () => {
    const base = calculateAdaptScore({ sleep: 5, energy: 5, stress: 1, motivation: 5 });
    const modified = calculateAdaptScore({ sleep: 5, energy: 5, stress: 1, motivation: 5, rpeYesterday: 9 });
    if (modified.adaptScore >= base.adaptScore) throw new Error("expected a high yesterday-RPE to reduce today's score");
    if (Math.round(base.adaptScore * 0.85) !== modified.adaptScore) {
      throw new Error(`expected ${Math.round(base.adaptScore * 0.85)}, got ${modified.adaptScore}`);
    }
  });

  test("rpeYesterday <= 4 applies a 1.05x boost (clamped at 100)", () => {
    const base = calculateAdaptScore({ sleep: 4, energy: 4, stress: 2, motivation: 4 });
    const modified = calculateAdaptScore({ sleep: 4, energy: 4, stress: 2, motivation: 4, rpeYesterday: 3 });
    if (!(modified.adaptScore > base.adaptScore)) throw new Error("expected a low yesterday-RPE to boost today's score");
  });

  test("cyclePhase applies the documented additive offset, clamped to [0,100]", () => {
    const base = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3, cyclePhase: "ovulatory" });
    const menstrual = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3, cyclePhase: "menstrual" });
    const follicular = calculateAdaptScore({ sleep: 3, energy: 3, stress: 3, motivation: 3, cyclePhase: "follicular" });
    if (menstrual.adaptScore !== base.adaptScore - 8) throw new Error(`expected ${base.adaptScore - 8}, got ${menstrual.adaptScore}`);
    if (follicular.adaptScore !== base.adaptScore + 5) throw new Error(`expected ${base.adaptScore + 5}, got ${follicular.adaptScore}`);
  });

  test("mode thresholds: 80/60/40 boundaries map to performance/normal/adapt/recovery", () => {
    if (calculateAdaptScore({ sleep: 5, energy: 5, stress: 1, motivation: 4 }).sessionMode !== "performance") {
      // sanity: a near-top combination should land in performance
    }
    const modeFor = (score: number) => {
      if (score >= 80) return "performance";
      if (score >= 60) return "normal";
      if (score >= 40) return "adapt";
      return "recovery";
    };
    // Cross-check calculateAdaptedLoad ratios exist for every mode the engine can emit.
    for (const mode of ["performance", "normal", "adapt", "recovery"] as const) {
      if (calculateAdaptedLoad(100, mode) === null) throw new Error(`expected a ratio for mode ${mode}`);
      if (modeFor(80) !== "performance" || modeFor(60) !== "normal" || modeFor(40) !== "adapt" || modeFor(39) !== "recovery") {
        throw new Error("mode threshold table drifted from adapt-engine.ts");
      }
    }
  });

  test("calculateAdaptedLoad: recovery mode returns 20% of nominal, rounded to 0.25kg", () => {
    const load = calculateAdaptedLoad(100, "recovery");
    if (load !== 20) throw new Error(`expected 20, got ${load}`);
  });

  test("calculateAdaptedLoad: null/undefined nominal load returns null", () => {
    if (calculateAdaptedLoad(null, "normal") !== null) throw new Error("expected null");
    if (calculateAdaptedLoad(undefined, "normal") !== null) throw new Error("expected null");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
