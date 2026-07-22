/**
 * ADAPT by LMJ — Seed Script
 * Run: pnpm --filter @workspace/scripts run seed
 */

import { db } from "@workspace/db";
import {
  usersTable,
  exercisesTable,
  programsTable,
  sessionsTable,
  sessionVariantsTable,
  sessionExercisesTable,
  checkinsTable,
  alertsTable,
} from "@workspace/db";
import { isNotNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Inline ADAPT score calculation (to avoid cross-artifact import) — kept in sync
// with artifacts/api-server/src/services/adapt-engine.ts (soreness dropped, V1).
function calculateAdaptScore(input: {
  sleep: number; energy: number; stress: number;
  motivation: number;
}) {
  const { sleep, energy, stress, motivation } = input;
  const sleep_n = (sleep - 1) / 4;
  const energy_n = (energy - 1) / 4;
  const stress_n = (stress - 1) / 4;
  const motivation_n = (motivation - 1) / 4;
  const score_base = sleep_n * 0.3125 + energy_n * 0.25 + (1 - stress_n) * 0.1875 + motivation_n * 0.25;
  const adaptScore = Math.round(Math.min(100, Math.max(0, score_base * 100)));
  let sessionMode: string;
  if (adaptScore >= 80) sessionMode = "performance";
  else if (adaptScore >= 60) sessionMode = "normal";
  else if (adaptScore >= 40) sessionMode = "adapt";
  else sessionMode = "recovery";
  return { adaptScore, sessionMode };
}

type ExerciseDef = { name: string; sets: number; reps: string; loadKg: number; restSeconds: number; cue: string | null };

type SessionDef = {
  weekNumber: number;
  dayNumber: number;
  name: string;
  type: "strength" | "hybrid" | "cardio" | "recovery";
  estimatedDurationMin: number;
  coachNotes: string;
  exercises: ExerciseDef[];
};

async function seed() {
  console.log("🌱 Starting ADAPT seed...");

  console.log("Clearing existing data...");
  await db.delete(alertsTable);
  await db.delete(sessionExercisesTable);
  await db.delete(sessionVariantsTable);
  await db.delete(sessionsTable);
  await db.delete(programsTable);
  await db.delete(checkinsTable);
  await db.delete(exercisesTable).where(isNotNull(exercisesTable.createdBy));
  await db.delete(usersTable);

  // =====================
  // COACH
  // =====================
  console.log("Creating coach...");
  const coachHash = await bcrypt.hash("Demo1234!", 12);
  const [coach] = await db.insert(usersTable).values({
    email: "coach@adapt.demo",
    passwordHash: coachHash,
    role: "coach",
    firstName: "Marc",
    lastName: "Dupont",
    inviteCode: "MARC01",
  }).returning();
  console.log(`  ✓ Coach: ${coach.email} (invite: ${coach.inviteCode})`);

  // =====================
  // ATHLETES
  // =====================
  console.log("Creating athletes...");
  const athleteHash = await bcrypt.hash("Demo1234!", 12);

  const [julien] = await db.insert(usersTable).values({
    email: "julien@adapt.demo",
    passwordHash: athleteHash,
    role: "athlete",
    firstName: "Julien",
    lastName: "Martin",
    fitnessLevel: "intermediate",
    primaryGoal: "performance",
    age: 28,
    weightKg: "82",
    coachId: coach.id,
  }).returning();

  const [sara] = await db.insert(usersTable).values({
    email: "sara@adapt.demo",
    passwordHash: athleteHash,
    role: "athlete",
    firstName: "Sara",
    lastName: "Khelil",
    fitnessLevel: "advanced",
    primaryGoal: "performance",
    age: 25,
    weightKg: "62",
    cycleTracking: true,
    coachId: coach.id,
  }).returning();

  const [tom] = await db.insert(usersTable).values({
    email: "tom@adapt.demo",
    passwordHash: athleteHash,
    role: "athlete",
    firstName: "Tom",
    lastName: "Bernard",
    fitnessLevel: "beginner",
    primaryGoal: "fitness",
    age: 35,
    weightKg: "95",
    coachId: coach.id,
  }).returning();

  const [marie] = await db.insert(usersTable).values({
    email: "marie@adapt.demo",
    passwordHash: athleteHash,
    role: "athlete",
    firstName: "Marie",
    lastName: "Leclerc",
    fitnessLevel: "intermediate",
    primaryGoal: "aesthetic",
    age: 31,
    weightKg: "58",
    coachId: coach.id,
  }).returning();

  console.log("  ✓ Julien, Sara, Tom, Marie created");

  // =====================
  // EXERCISES (17)
  // =====================
  console.log("Creating exercises...");
  const exerciseData: Array<{ name: string; category: "compound" | "isolation" | "cardio" | "mobility"; muscleGroups: string[]; equipment: string[] }> = [
    { name: "Développé couché barre",  category: "compound",  muscleGroups: ["chest", "triceps", "shoulders"],          equipment: ["barbell", "bench"] },
    { name: "Squat barre",             category: "compound",  muscleGroups: ["quadriceps", "glutes", "hamstrings"],     equipment: ["barbell", "squat_rack"] },
    { name: "Soulevé de terre",        category: "compound",  muscleGroups: ["back", "glutes", "hamstrings"],           equipment: ["barbell"] },
    { name: "Tractions",               category: "compound",  muscleGroups: ["back", "biceps"],                         equipment: ["pull_up_bar"] },
    { name: "Rowing barre",            category: "compound",  muscleGroups: ["back", "biceps"],                         equipment: ["barbell"] },
    { name: "Développé militaire",     category: "compound",  muscleGroups: ["shoulders", "triceps"],                   equipment: ["barbell"] },
    { name: "Leg press",               category: "compound",  muscleGroups: ["quadriceps", "glutes"],                   equipment: ["leg_press_machine"] },
    { name: "Curl biceps",             category: "isolation", muscleGroups: ["biceps"],                                 equipment: ["dumbbell"] },
    { name: "Triceps poulie",          category: "isolation", muscleGroups: ["triceps"],                                equipment: ["cable_machine"] },
    { name: "Gainage planche",         category: "mobility",  muscleGroups: ["core"],                                   equipment: [] },
    { name: "Fentes marchées",         category: "compound",  muscleGroups: ["quadriceps", "glutes", "hamstrings"],     equipment: ["dumbbell"] },
    { name: "Hip thrust",              category: "compound",  muscleGroups: ["glutes", "hamstrings"],                   equipment: ["barbell", "bench"] },
    { name: "Rowing TRX",              category: "compound",  muscleGroups: ["back", "biceps"],                         equipment: ["trx"] },
    { name: "Sprint 200m",             category: "cardio",    muscleGroups: ["legs", "cardiovascular"],                 equipment: [] },
    { name: "Mobilité hanches",        category: "mobility",  muscleGroups: ["hips"],                                   equipment: [] },
    { name: "Dips triceps",            category: "compound",  muscleGroups: ["triceps", "chest"],                       equipment: ["parallel_bars"] },
    { name: "Presse à épaules",        category: "compound",  muscleGroups: ["shoulders", "triceps"],                   equipment: ["dumbbell"] },
  ];

  const exercises: Record<string, typeof exercisesTable.$inferSelect> = {};
  for (const ex of exerciseData) {
    const [created] = await db.insert(exercisesTable).values({
      name: ex.name,
      category: ex.category,
      muscleGroups: ex.muscleGroups,
      equipment: ex.equipment,
      createdBy: coach.id,
    }).returning();
    exercises[ex.name] = created;
  }
  console.log(`  ✓ ${Object.keys(exercises).length} exercises created`);

  // =====================
  // PROGRAM FOR JULIEN — 4 weeks × 3 sessions/week = 12 sessions
  // Load increases ~5% each week (progressive overload)
  // =====================
  console.log("Creating 4-week demo program...");
  const [program] = await db.insert(programsTable).values({
    coachId: coach.id,
    athleteId: julien.id,
    name: "Force & Conditionnement — 4 semaines",
    description: "Programme de force complet avec 3 séances par semaine (Lun/Mer/Ven). Progression de charge +5% par semaine.",
    durationWeeks: 4,
    startDate: new Date().toISOString().split("T")[0],
    isActive: true,
  }).returning();

  // Base session templates (week 1 loads; will be scaled per week)
  const weeklyLoadProgression = [1.0, 1.05, 1.10, 1.075]; // W1 / W2 / W3 / W4 (deload-ish)

  const baseSessionDefs: Omit<SessionDef, "weekNumber">[] = [
    {
      dayNumber: 1, name: "Force Haut du Corps",
      type: "strength", estimatedDurationMin: 55,
      coachNotes: "Bien s'échauffer avant de commencer. Concentre-toi sur la technique.",
      exercises: [
        { name: "Développé couché barre", sets: 4, reps: "6-8",   loadKg: 90,  restSeconds: 180, cue: "Contrôle la descente 3 sec" },
        { name: "Rowing barre",           sets: 4, reps: "6-8",   loadKg: 80,  restSeconds: 180, cue: null },
        { name: "Développé militaire",    sets: 3, reps: "8-10",  loadKg: 60,  restSeconds: 120, cue: null },
        { name: "Tractions",              sets: 3, reps: "6-10",  loadKg: 0,   restSeconds: 120, cue: null },
        { name: "Curl biceps",            sets: 3, reps: "10-12", loadKg: 20,  restSeconds: 90,  cue: null },
        { name: "Triceps poulie",         sets: 3, reps: "10-12", loadKg: 25,  restSeconds: 90,  cue: null },
      ],
    },
    {
      dayNumber: 3, name: "Force Bas du Corps",
      type: "strength", estimatedDurationMin: 60,
      coachNotes: "Bien s'échauffer avant de commencer. Ajuste les charges selon ton ressenti.",
      exercises: [
        { name: "Squat barre",      sets: 4, reps: "6-8",           loadKg: 120, restSeconds: 180, cue: "Talons au sol, genoux dans l'axe" },
        { name: "Soulevé de terre", sets: 3, reps: "5-6",           loadKg: 140, restSeconds: 240, cue: "Dos droit, barre contre les tibias" },
        { name: "Leg press",        sets: 3, reps: "10-12",         loadKg: 200, restSeconds: 120, cue: null },
        { name: "Fentes marchées",  sets: 3, reps: "10 par jambe",  loadKg: 20,  restSeconds: 90,  cue: null },
        { name: "Hip thrust",       sets: 3, reps: "12-15",         loadKg: 80,  restSeconds: 90,  cue: null },
        { name: "Gainage planche",  sets: 3, reps: "60s",           loadKg: 0,   restSeconds: 60,  cue: null },
      ],
    },
    {
      dayNumber: 5, name: "Full Body Hybride",
      type: "hybrid", estimatedDurationMin: 50,
      coachNotes: "Séance mixte force + cardio. Reste concentré sur la qualité de mouvement.",
      exercises: [
        { name: "Squat barre",           sets: 3, reps: "8-10",   loadKg: 100, restSeconds: 150, cue: null },
        { name: "Développé couché barre",sets: 3, reps: "8-10",   loadKg: 80,  restSeconds: 150, cue: null },
        { name: "Soulevé de terre",      sets: 3, reps: "8-10",   loadKg: 110, restSeconds: 180, cue: null },
        { name: "Rowing TRX",            sets: 3, reps: "12-15",  loadKg: 0,   restSeconds: 90,  cue: null },
        { name: "Sprint 200m",           sets: 4, reps: "1 sprint",loadKg: 0,   restSeconds: 120, cue: "Récupération complète entre les sprints" },
        { name: "Mobilité hanches",      sets: 1, reps: "10 min", loadKg: 0,   restSeconds: 0,   cue: null },
      ],
    },
  ];

  const modes = ["performance", "normal", "adapt", "recovery"] as const;
  const modeLoadMult:  Record<typeof modes[number], number> = { performance: 1.025, normal: 1.0, adapt: 0.775, recovery: 0.2 };
  const modeSetMult:   Record<typeof modes[number], number> = { performance: 1.0,   normal: 1.0, adapt: 0.8,   recovery: 0.5 };
  const modeNotes:     Record<typeof modes[number], string | null> = {
    performance: "Journée de force ! Dépasse tes limites.",
    normal: null,
    adapt: "Réduire les charges de ~25%. Écoute ton corps.",
    recovery: "Poids légers, technique avant tout. Pas d'effort maximal.",
  };

  let totalSessions = 0;
  for (let week = 1; week <= 4; week++) {
    const weekLoadFactor = weeklyLoadProgression[week - 1];
    for (const base of baseSessionDefs) {
      const [session] = await db.insert(sessionsTable).values({
        programId: program.id,
        weekNumber: week,
        dayNumber: base.dayNumber,
        name: base.name + ` — S${week}`,
        type: base.type,
        estimatedDurationMin: base.estimatedDurationMin,
        coachNotes: base.coachNotes,
      }).returning();

      for (const mode of modes) {
        const loadMult = modeLoadMult[mode] * weekLoadFactor;
        const setMult  = modeSetMult[mode];

        const [variant] = await db.insert(sessionVariantsTable).values({
          sessionId: session.id,
          mode,
          volumeModifier:    setMult.toString(),
          intensityModifier: loadMult.toFixed(4),
          notes: modeNotes[mode],
        }).returning();

        for (let i = 0; i < base.exercises.length; i++) {
          const exDef   = base.exercises[i];
          const exercise = exercises[exDef.name];
          if (!exercise) continue;

          // Round load to nearest 1.25 kg increment
          const rawLoad      = exDef.loadKg > 0 ? exDef.loadKg * loadMult : 0;
          const adjustedLoad = rawLoad > 0 ? Math.round(rawLoad / 1.25) * 1.25 : 0;
          const adjustedSets = Math.max(2, Math.round(exDef.sets * setMult));

          await db.insert(sessionExercisesTable).values({
            variantId:  variant.id,
            exerciseId: exercise.id,
            orderIndex: i + 1,
            sets:       adjustedSets,
            reps:       exDef.reps,
            loadKg:     adjustedLoad > 0 ? adjustedLoad.toString() : null,
            restSeconds: exDef.restSeconds,
            coachCue:   exDef.cue,
          });
        }
      }
      totalSessions++;
    }
  }
  console.log(`  ✓ Program: 4 weeks × 3 sessions = ${totalSessions} sessions × 4 variants`);

  // =====================
  // CHECK-INS
  // Julien: 10 days of varied check-ins
  // Sara:   8 days of high-performance check-ins
  // Tom:    5 days with a pain check-in (P1 alert)
  // Marie:  4 days then 4-day gap → inactivity alert
  // =====================
  console.log("Creating check-in history...");

  type CheckinConfig = {
    sleep: number; energy: number; stress: number;
    motivation: number;
    hasPain?: boolean; painNotes?: string;
  };

  const checkinConfigs: Array<{ athlete: typeof julien; configs: CheckinConfig[] }> = [
    {
      athlete: julien,
      configs: [
        { sleep: 3, energy: 3, stress: 3, motivation: 3 },
        { sleep: 4, energy: 3, stress: 2, motivation: 4 },
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
        { sleep: 5, energy: 4, stress: 2, motivation: 5 },
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
        { sleep: 3, energy: 4, stress: 2, motivation: 3 },
        { sleep: 4, energy: 3, stress: 3, motivation: 4 },
        { sleep: 5, energy: 5, stress: 1, motivation: 5 },
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
      ],
    },
    {
      athlete: sara,
      configs: [
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
        { sleep: 5, energy: 4, stress: 2, motivation: 4 },
        { sleep: 5, energy: 5, stress: 1, motivation: 5 },
        { sleep: 4, energy: 5, stress: 1, motivation: 5 },
        { sleep: 5, energy: 4, stress: 2, motivation: 4 },
        { sleep: 4, energy: 4, stress: 2, motivation: 5 },
        { sleep: 5, energy: 5, stress: 1, motivation: 5 },
        { sleep: 4, energy: 5, stress: 1, motivation: 4 },
      ],
    },
    {
      athlete: tom,
      configs: [
        { sleep: 3, energy: 2, stress: 4, motivation: 2 },
        { sleep: 2, energy: 2, stress: 4, motivation: 2, hasPain: true, painNotes: "Douleur genou droit, 6/10" },
        { sleep: 3, energy: 2, stress: 4, motivation: 2 },
        { sleep: 2, energy: 2, stress: 5, motivation: 1 },
        { sleep: 3, energy: 2, stress: 4, motivation: 2 },
      ],
    },
    {
      athlete: marie,
      configs: [
        // 4 check-ins then stops → triggers inactivity alert
        { sleep: 4, energy: 3, stress: 3, motivation: 3 },
        { sleep: 3, energy: 3, stress: 3, motivation: 3 },
        { sleep: 4, energy: 4, stress: 2, motivation: 4 },
        { sleep: 3, energy: 3, stress: 3, motivation: 3 },
      ],
    },
  ];

  // Marie's last check-in is 4 days ago (gap triggers inactivity alert)
  const marieGapDays = 4;

  for (const { athlete, configs } of checkinConfigs) {
    const isMarie = athlete.id === marie.id;
    // For Marie, start 4 more days back to create the gap
    const extraOffset = isMarie ? marieGapDays : 0;
    let dayOffset = configs.length + extraOffset;

    for (const config of configs) {
      const date = new Date(Date.now() - dayOffset * 86400000).toISOString().split("T")[0];
      dayOffset--;

      const { adaptScore, sessionMode: baseMode } = calculateAdaptScore(config);
      const sessionMode = config.hasPain ? "recovery" : baseMode;

      await db.insert(checkinsTable).values({
        athleteId:   athlete.id,
        date,
        sleep:       config.sleep,
        energy:      config.energy,
        stress:      config.stress,
        motivation:  config.motivation,
        hasPain:     config.hasPain ?? false,
        painNotes:   config.painNotes ?? null,
        adaptScore,
        sessionMode,
      });
    }
  }
  console.log("  ✓ Check-in history created (Julien:10, Sara:8, Tom:5, Marie:4 then 4-day gap)");

  // =====================
  // ALERTS
  // =====================
  console.log("Creating alerts...");

  await db.insert(alertsTable).values({
    coachId:    coach.id,
    athleteId:  tom.id,
    type:       "pain",
    priority:   "p1",
    message:    "Tom a signalé une douleur au genou droit (6/10). Mode RECOVERY forcé jusqu'à validation coach.",
    isRead:     false,
    isResolved: false,
  });

  await db.insert(alertsTable).values({
    coachId:    coach.id,
    athleteId:  marie.id,
    type:       "inactivity",
    priority:   "p2",
    message:    "Marie n'a pas effectué de check-in depuis plus de 4 jours.",
    isRead:     false,
    isResolved: false,
  });

  console.log("  ✓ Alerts created (P1: Tom pain, P2: Marie inactivity)");
  console.log("\nSeeding global exercise library...");
  const { spawnSync } = await import("child_process");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const __dirname_scripts = dirname(fileURLToPath(import.meta.url));
  const seedExercisesPath = join(__dirname_scripts, "../../../artifacts/api-server/src/scripts/seed-exercises.ts");
  const result = spawnSync("npx", ["tsx", seedExercisesPath], { stdio: "inherit", encoding: "utf-8" });
  if (result.status !== 0) console.warn("  ⚠ seed-exercises.ts returned non-zero, continuing");
  else console.log("  ✓ Exercices globaux insérés via seed-exercises.ts");

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo accounts:");
  console.log("  Coach: coach@adapt.demo / Demo1234! (invite code: MARC01)");
  console.log("  Julien: julien@adapt.demo / Demo1234! (10 check-ins, normal/perf)");
  console.log("  Sara: sara@adapt.demo / Demo1234! (8 check-ins, high performance)");
  console.log("  Tom: tom@adapt.demo / Demo1234! (5 check-ins, P1 pain/knee alert)");
  console.log("  Marie: marie@adapt.demo / Demo1234! (4 check-ins, 4-day gap, P2 inactivity)");
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
