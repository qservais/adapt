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
  sessionLogsTable,
  alertsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

// Inline ADAPT score calculation (to avoid cross-artifact import)
function calculateAdaptScore(input: {
  sleep: number; energy: number; stress: number;
  soreness: number; motivation: number;
}) {
  const { sleep, energy, stress, soreness, motivation } = input;
  const sleep_n = (sleep - 1) / 4;
  const energy_n = (energy - 1) / 4;
  const stress_n = (stress - 1) / 4;
  const soreness_n = (soreness - 1) / 4;
  const motivation_n = (motivation - 1) / 4;
  const score_base = sleep_n * 0.25 + energy_n * 0.20 + (1 - stress_n) * 0.15 + (1 - soreness_n) * 0.20 + motivation_n * 0.20;
  const adaptScore = Math.round(Math.min(100, Math.max(0, score_base * 100)));
  let sessionMode: string;
  if (adaptScore >= 80) sessionMode = "performance";
  else if (adaptScore >= 60) sessionMode = "normal";
  else if (adaptScore >= 40) sessionMode = "adapt";
  else sessionMode = "recovery";
  return { adaptScore, sessionMode };
}

async function seed() {
  console.log("🌱 Starting ADAPT seed...");

  console.log("Clearing existing data...");
  await db.delete(alertsTable);
  await db.delete(sessionLogsTable);
  await db.delete(checkinsTable);
  await db.delete(sessionExercisesTable);
  await db.delete(sessionVariantsTable);
  await db.delete(sessionsTable);
  await db.delete(programsTable);
  await db.delete(exercisesTable);
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
  const exerciseData = [
    { name: "Développé couché barre", category: "compound", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell", "bench"] },
    { name: "Squat barre", category: "compound", muscleGroups: ["quadriceps", "glutes", "hamstrings"], equipment: ["barbell", "squat_rack"] },
    { name: "Soulevé de terre", category: "compound", muscleGroups: ["back", "glutes", "hamstrings"], equipment: ["barbell"] },
    { name: "Tractions", category: "compound", muscleGroups: ["back", "biceps"], equipment: ["pull_up_bar"] },
    { name: "Rowing barre", category: "compound", muscleGroups: ["back", "biceps"], equipment: ["barbell"] },
    { name: "Développé militaire", category: "compound", muscleGroups: ["shoulders", "triceps"], equipment: ["barbell"] },
    { name: "Leg press", category: "compound", muscleGroups: ["quadriceps", "glutes"], equipment: ["leg_press_machine"] },
    { name: "Curl biceps", category: "isolation", muscleGroups: ["biceps"], equipment: ["dumbbell"] },
    { name: "Triceps poulie", category: "isolation", muscleGroups: ["triceps"], equipment: ["cable_machine"] },
    { name: "Gainage planche", category: "mobility", muscleGroups: ["core"], equipment: [] },
    { name: "Fentes marchées", category: "compound", muscleGroups: ["quadriceps", "glutes", "hamstrings"], equipment: ["dumbbell"] },
    { name: "Hip thrust", category: "compound", muscleGroups: ["glutes", "hamstrings"], equipment: ["barbell", "bench"] },
    { name: "Rowing TRX", category: "compound", muscleGroups: ["back", "biceps"], equipment: ["trx"] },
    { name: "Sprint 200m", category: "cardio", muscleGroups: ["legs", "cardiovascular"], equipment: [] },
    { name: "Mobilité hanches", category: "mobility", muscleGroups: ["hips"], equipment: [] },
    { name: "Dips triceps", category: "compound", muscleGroups: ["triceps", "chest"], equipment: ["parallel_bars"] },
    { name: "Presse à épaules", category: "compound", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbell"] },
  ];

  const exercises: Record<string, any> = {};
  for (const ex of exerciseData) {
    const [created] = await db.insert(exercisesTable).values({
      name: ex.name,
      category: ex.category as any,
      muscleGroups: ex.muscleGroups,
      equipment: ex.equipment,
      createdBy: coach.id,
    }).returning();
    exercises[ex.name] = created;
  }
  console.log(`  ✓ ${Object.keys(exercises).length} exercises created`);

  // =====================
  // PROGRAM FOR JULIEN
  // =====================
  console.log("Creating demo program...");
  const [program] = await db.insert(programsTable).values({
    coachId: coach.id,
    athleteId: julien.id,
    name: "Force & Conditionnement — 4 semaines",
    description: "Programme de force complet avec 3 séances par semaine (Lun/Mer/Ven)",
    durationWeeks: 4,
    startDate: new Date().toISOString().split("T")[0],
    isActive: true,
  }).returning();

  const sessionDefs = [
    {
      weekNumber: 1, dayNumber: 1, name: "Force Haut du Corps",
      type: "strength", estimatedDurationMin: 55,
      exercises: [
        { name: "Développé couché barre", sets: 4, reps: "6-8", loadKg: 90, restSeconds: 180, cue: "Contrôle la descente 3 sec" },
        { name: "Rowing barre", sets: 4, reps: "6-8", loadKg: 80, restSeconds: 180, cue: null },
        { name: "Développé militaire", sets: 3, reps: "8-10", loadKg: 60, restSeconds: 120, cue: null },
        { name: "Tractions", sets: 3, reps: "6-10", loadKg: 0, restSeconds: 120, cue: null },
        { name: "Curl biceps", sets: 3, reps: "10-12", loadKg: 20, restSeconds: 90, cue: null },
        { name: "Triceps poulie", sets: 3, reps: "10-12", loadKg: 25, restSeconds: 90, cue: null },
      ]
    },
    {
      weekNumber: 1, dayNumber: 3, name: "Force Bas du Corps",
      type: "strength", estimatedDurationMin: 60,
      exercises: [
        { name: "Squat barre", sets: 4, reps: "6-8", loadKg: 120, restSeconds: 180, cue: "Talons au sol, genoux dans l'axe" },
        { name: "Soulevé de terre", sets: 3, reps: "5-6", loadKg: 140, restSeconds: 240, cue: "Dos droit, barre contre les tibias" },
        { name: "Leg press", sets: 3, reps: "10-12", loadKg: 200, restSeconds: 120, cue: null },
        { name: "Fentes marchées", sets: 3, reps: "10 par jambe", loadKg: 20, restSeconds: 90, cue: null },
        { name: "Hip thrust", sets: 3, reps: "12-15", loadKg: 80, restSeconds: 90, cue: null },
        { name: "Gainage planche", sets: 3, reps: "60s", loadKg: 0, restSeconds: 60, cue: null },
      ]
    },
    {
      weekNumber: 1, dayNumber: 5, name: "Full Body Hybride",
      type: "hybrid", estimatedDurationMin: 50,
      exercises: [
        { name: "Squat barre", sets: 3, reps: "8-10", loadKg: 100, restSeconds: 150, cue: null },
        { name: "Développé couché barre", sets: 3, reps: "8-10", loadKg: 80, restSeconds: 150, cue: null },
        { name: "Soulevé de terre", sets: 3, reps: "8-10", loadKg: 110, restSeconds: 180, cue: null },
        { name: "Rowing TRX", sets: 3, reps: "12-15", loadKg: 0, restSeconds: 90, cue: null },
        { name: "Sprint 200m", sets: 4, reps: "1 sprint", loadKg: 0, restSeconds: 120, cue: "Récupération complète entre les sprints" },
        { name: "Mobilité hanches", sets: 1, reps: "10 min", loadKg: 0, restSeconds: 0, cue: null },
      ]
    },
  ];

  const modes = ["performance", "normal", "adapt", "recovery"] as const;
  const loadMultipliers = { performance: 1.025, normal: 1.0, adapt: 0.775, recovery: 0.2 };
  const setMultipliers = { performance: 1.0, normal: 1.0, adapt: 0.8, recovery: 0.5 };

  for (const def of sessionDefs) {
    const [session] = await db.insert(sessionsTable).values({
      programId: program.id,
      weekNumber: def.weekNumber,
      dayNumber: def.dayNumber,
      name: def.name,
      type: def.type as any,
      estimatedDurationMin: def.estimatedDurationMin,
      coachNotes: "Bien s'échauffer avant de commencer. Ajuste les charges selon ton ressenti.",
    }).returning();

    for (const mode of modes) {
      const loadMult = loadMultipliers[mode];
      const setMult = setMultipliers[mode];

      const [variant] = await db.insert(sessionVariantsTable).values({
        sessionId: session.id,
        mode,
        volumeModifier: setMult.toString(),
        intensityModifier: loadMult.toString(),
        notes: mode === "recovery" ? "Poids légers, technique avant tout. Pas d'effort maximal." :
               mode === "adapt" ? "Réduire les charges de ~25%. Écoute ton corps." :
               mode === "performance" ? "Journée de force ! Dépasse tes limites." : null,
      }).returning();

      for (let i = 0; i < def.exercises.length; i++) {
        const exDef = def.exercises[i];
        const exercise = exercises[exDef.name];
        if (!exercise) continue;

        const adjustedLoad = exDef.loadKg > 0 ? Math.round(exDef.loadKg * loadMult * 4) / 4 : 0;
        const adjustedSets = Math.max(2, Math.round(exDef.sets * setMult));

        await db.insert(sessionExercisesTable).values({
          variantId: variant.id,
          exerciseId: exercise.id,
          orderIndex: i + 1,
          sets: adjustedSets,
          reps: exDef.reps,
          loadKg: adjustedLoad > 0 ? adjustedLoad.toString() : null,
          restSeconds: exDef.restSeconds,
          coachCue: exDef.cue,
        });
      }
    }
  }
  console.log(`  ✓ Program created with ${sessionDefs.length} sessions × 4 variants`);

  // =====================
  // CHECK-INS (last 7 days)
  // =====================
  console.log("Creating check-in history...");

  const checkinConfigs: Array<{
    athlete: typeof julien;
    configs: Array<{ sleep: number; energy: number; stress: number; soreness: number; motivation: number; hasPain?: boolean; painNotes?: string }>;
  }> = [
    {
      athlete: julien,
      configs: [
        { sleep: 4, energy: 4, stress: 2, soreness: 2, motivation: 4 },
        { sleep: 3, energy: 3, stress: 3, soreness: 3, motivation: 3 },
        { sleep: 4, energy: 3, stress: 2, soreness: 3, motivation: 4 },
        { sleep: 5, energy: 4, stress: 2, soreness: 2, motivation: 5 },
        { sleep: 4, energy: 4, stress: 2, soreness: 2, motivation: 4 },
        { sleep: 3, energy: 4, stress: 2, soreness: 2, motivation: 3 },
      ],
    },
    {
      athlete: sara,
      configs: [
        { sleep: 5, energy: 5, stress: 1, soreness: 1, motivation: 5 },
        { sleep: 4, energy: 5, stress: 1, soreness: 2, motivation: 5 },
        { sleep: 5, energy: 4, stress: 2, soreness: 1, motivation: 4 },
        { sleep: 4, energy: 4, stress: 2, soreness: 2, motivation: 5 },
        { sleep: 5, energy: 5, stress: 1, soreness: 1, motivation: 5 },
        { sleep: 4, energy: 5, stress: 1, soreness: 2, motivation: 4 },
      ],
    },
    {
      athlete: tom,
      configs: [
        { sleep: 3, energy: 2, stress: 4, soreness: 4, motivation: 2 },
        { sleep: 2, energy: 2, stress: 4, soreness: 4, motivation: 2, hasPain: true, painNotes: "Douleur genou droit, 6/10" },
        { sleep: 3, energy: 2, stress: 4, soreness: 4, motivation: 2 },
      ],
    },
    {
      athlete: marie,
      configs: [
        { sleep: 4, energy: 3, stress: 3, soreness: 2, motivation: 3 },
        { sleep: 3, energy: 3, stress: 3, soreness: 3, motivation: 3 },
        { sleep: 4, energy: 4, stress: 2, soreness: 2, motivation: 4 },
        // No check-ins for last 3 days → inactivity alert
      ],
    },
  ];

  for (const { athlete, configs } of checkinConfigs) {
    let dayOffset = configs.length;
    for (const config of configs) {
      const date = new Date(Date.now() - dayOffset * 86400000).toISOString().split("T")[0];
      dayOffset--;

      const { adaptScore, sessionMode: baseMode } = calculateAdaptScore(config);
      const sessionMode = config.hasPain ? "recovery" : baseMode;

      await db.insert(checkinsTable).values({
        athleteId: athlete.id,
        date,
        sleep: config.sleep,
        energy: config.energy,
        stress: config.stress,
        soreness: config.soreness,
        motivation: config.motivation,
        hasPain: config.hasPain ?? false,
        painNotes: config.painNotes ?? null,
        adaptScore,
        sessionMode,
      });
    }
  }
  console.log("  ✓ Check-in history created");

  // =====================
  // ALERTS
  // =====================
  console.log("Creating alerts...");

  await db.insert(alertsTable).values({
    coachId: coach.id,
    athleteId: tom.id,
    type: "pain",
    priority: "p1",
    message: "Tom a signalé une douleur au genou droit (6/10). Mode RECOVERY forcé jusqu'à validation coach.",
    isRead: false,
    isResolved: false,
  });

  await db.insert(alertsTable).values({
    coachId: coach.id,
    athleteId: marie.id,
    type: "inactivity",
    priority: "p2",
    message: "Marie n'a pas effectué de check-in depuis plus de 3 jours.",
    isRead: false,
    isResolved: false,
  });

  console.log("  ✓ Alerts created (P1: Tom pain, P2: Marie inactivity)");
  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo accounts:");
  console.log("  Coach: coach@adapt.demo / Demo1234! (invite code: MARC01)");
  console.log("  Julien: julien@adapt.demo / Demo1234! (scores 60-82, normal/perf)");
  console.log("  Sara: sara@adapt.demo / Demo1234! (scores 80-100, performance)");
  console.log("  Tom: tom@adapt.demo / Demo1234! (P1 pain alert, knee)");
  console.log("  Marie: marie@adapt.demo / Demo1234! (P2 inactivity, 3 days no check-in)");
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
