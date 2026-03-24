/**
 * ADAPT ENGINE — Core decision algorithm
 * Calculates adaptive score (0-100) and determines session mode
 * Server-side only — never called from frontend
 */

export interface AdaptScoreInput {
  sleep: number;
  energy: number;
  stress: number;
  soreness: number;
  motivation: number;
  rpeYesterday?: number | null;
  cyclePhase?: string | null;
}

export interface AdaptScoreResult {
  adaptScore: number;
  sessionMode: "performance" | "normal" | "adapt" | "recovery";
}

export function calculateAdaptScore(input: AdaptScoreInput): AdaptScoreResult {
  const { sleep, energy, stress, soreness, motivation, rpeYesterday = null, cyclePhase = null } = input;

  // Step 1 — Normalize (0.0 to 1.0)
  const sleep_n = (sleep - 1) / 4;
  const energy_n = (energy - 1) / 4;
  const stress_n = (stress - 1) / 4;
  const soreness_n = (soreness - 1) / 4;
  const motivation_n = (motivation - 1) / 4;

  // Step 2 — Weighted base score
  let score_base =
    sleep_n * 0.25 +
    energy_n * 0.20 +
    (1 - stress_n) * 0.15 +
    (1 - soreness_n) * 0.20 +
    motivation_n * 0.20;

  // Step 3 — Previous RPE modifier
  if (rpeYesterday !== null && rpeYesterday !== undefined) {
    if (rpeYesterday >= 9) score_base *= 0.85;
    else if (rpeYesterday >= 8) score_base *= 0.90;
    else if (rpeYesterday <= 4) score_base *= 1.05;
  }

  // Step 4 — Menstrual cycle additive offset (applied on 0-100 scale)
  const cycleOffsets: Record<string, number> = {
    menstrual: -8,
    follicular: 5,
    ovulatory: 0,
    luteal: -5,
  };
  const cycleOffset = cyclePhase ? (cycleOffsets[cyclePhase] ?? 0) : 0;

  // Step 5 — Final score (0-100, rounded)
  const adaptScore = Math.round(Math.min(100, Math.max(0, score_base * 100 + cycleOffset)));

  // Step 6 — Determine mode
  let sessionMode: "performance" | "normal" | "adapt" | "recovery";
  if (adaptScore >= 80) sessionMode = "performance";
  else if (adaptScore >= 60) sessionMode = "normal";
  else if (adaptScore >= 40) sessionMode = "adapt";
  else sessionMode = "recovery";

  return { adaptScore, sessionMode };
}

/**
 * Calculate adapted load based on mode
 * @param nominalKg - Nominal load from program
 * @param mode - ADAPT mode
 * @returns Suggested load in kg (rounded to 0.25kg)
 */
export function calculateAdaptedLoad(nominalKg: number | null | undefined, mode: string): number | null {
  if (!nominalKg) return null;

  const ratios: Record<string, number> = {
    performance: 1.025,  // +2.5%
    normal: 1.00,
    adapt: 0.775,        // 75-80%
    recovery: 0.20,      // 0-40%, use 20%
  };

  const ratio = ratios[mode] ?? 1.0;
  return Math.round(nominalKg * ratio * 4) / 4; // round to 0.25kg
}
