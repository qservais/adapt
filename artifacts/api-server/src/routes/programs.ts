import { Router } from "express";
import { db } from "@workspace/db";
import { programsTable, sessionsTable, sessionVariantsTable, sessionExercisesTable, sessionBlocksTable, exercisesTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const ALL_SESSION_TYPES = [
  "strength", "cardio", "hybrid", "mobility", "athletic_development", "running", "conditioning",
  "hypertrophie", "coordination", "technique", "endurance",
] as const;
type SessionType = typeof ALL_SESSION_TYPES[number];

const router = Router();

router.get("/programs", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programs = await db.select({
      id: programsTable.id,
      name: programsTable.name,
      athleteId: programsTable.athleteId,
      durationWeeks: programsTable.durationWeeks,
      startDate: programsTable.startDate,
      isActive: programsTable.isActive,
      createdAt: programsTable.createdAt,
      athleteFirstName: usersTable.firstName,
      athleteLastName: usersTable.lastName,
    })
      .from(programsTable)
      .innerJoin(usersTable, eq(programsTable.athleteId, usersTable.id))
      .where(eq(programsTable.coachId, req.user!.userId));

    res.json(programs.map(p => ({
      id: p.id,
      name: p.name,
      athleteId: p.athleteId,
      athleteName: `${p.athleteFirstName} ${p.athleteLastName ?? ""}`.trim(),
      durationWeeks: p.durationWeeks,
      startDate: p.startDate,
      isActive: p.isActive,
      createdAt: p.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  athleteId: z.string().uuid(),
  durationWeeks: z.number().int().min(1),
  startDate: z.string().optional(),
});

router.post("/programs", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createProgramSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const [athlete] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, req.user!.userId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Athlete not linked to you" } });
      return;
    }

    const [program] = await db.insert(programsTable).values({
      coachId: req.user!.userId,
      athleteId: parsed.data.athleteId,
      name: parsed.data.name,
      description: parsed.data.description,
      durationWeeks: parsed.data.durationWeeks,
      startDate: parsed.data.startDate,
    }).returning();

    res.status(201).json({
      id: program.id,
      name: program.name,
      athleteId: program.athleteId,
      athleteName: `${athlete.firstName} ${athlete.lastName ?? ""}`.trim(),
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      createdAt: program.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/programs/:programId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programId = String(req.params["programId"]);

    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const sessions = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.programId, program.id))
      .orderBy(sessionsTable.weekNumber, sessionsTable.dayNumber);

    const sessionsWithVariants = await Promise.all(sessions.map(async (session) => {
      const blocks = await db.select().from(sessionBlocksTable)
        .where(eq(sessionBlocksTable.sessionId, session.id))
        .orderBy(sessionBlocksTable.orderIndex);

      const variants = await db.select().from(sessionVariantsTable)
        .where(eq(sessionVariantsTable.sessionId, session.id));

      const variantsWithExercises = await Promise.all(variants.map(async (variant) => {
        const exercises = await db.select({
          id: sessionExercisesTable.id,
          exerciseId: sessionExercisesTable.exerciseId,
          blockId: sessionExercisesTable.blockId,
          orderIndex: sessionExercisesTable.orderIndex,
          sets: sessionExercisesTable.sets,
          reps: sessionExercisesTable.reps,
          loadKg: sessionExercisesTable.loadKg,
          restSeconds: sessionExercisesTable.restSeconds,
          coachCue: sessionExercisesTable.coachCue,
          tempo: sessionExercisesTable.tempo,
          supersetGroup: sessionExercisesTable.supersetGroup,
          supersetLabel: sessionExercisesTable.supersetLabel,
          exerciseName: exercisesTable.name,
        })
          .from(sessionExercisesTable)
          .innerJoin(exercisesTable, eq(sessionExercisesTable.exerciseId, exercisesTable.id))
          .where(eq(sessionExercisesTable.variantId, variant.id))
          .orderBy(sessionExercisesTable.orderIndex);

        return {
          id: variant.id,
          mode: variant.mode,
          volumeModifier: parseFloat(variant.volumeModifier ?? "1.0"),
          intensityModifier: parseFloat(variant.intensityModifier ?? "1.0"),
          notes: variant.notes,
          exercises: exercises.map(ex => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            blockId: ex.blockId,
            exerciseName: ex.exerciseName,
            orderIndex: ex.orderIndex,
            sets: ex.sets,
            reps: ex.reps,
            nominalLoadKg: ex.loadKg ? parseFloat(ex.loadKg) : null,
            restSeconds: ex.restSeconds,
            coachCue: ex.coachCue,
            tempo: ex.tempo,
            supersetGroup: ex.supersetGroup,
            supersetLabel: ex.supersetLabel,
          })),
        };
      }));

      return {
        id: session.id,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        name: session.name,
        type: session.type,
        sessionType: session.sessionType ?? "online",
        scheduledTime: session.scheduledTime ?? null,
        visioLink: session.visioLink ?? null,
        estimatedDurationMin: session.estimatedDurationMin,
        coachNotes: session.coachNotes,
        blocks: blocks.map(b => ({
          id: b.id,
          type: b.type,
          orderIndex: b.orderIndex,
          name: b.name,
          notes: b.notes,
          estimatedDurationMin: b.estimatedDurationMin,
          conditioningFormat: b.conditioningFormat,
        })),
        variants: variantsWithExercises,
      };
    }));

    res.json({
      id: program.id,
      name: program.name,
      description: program.description,
      athleteId: program.athleteId,
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      sessions: sessionsWithVariants,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/programs/:programId", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createProgramSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const programId = String(req.params["programId"]);
    const data = parsed.data;

    // If reassigning athleteId, validate the new athlete is linked to this coach
    if (data.athleteId) {
      const [linkedAthlete] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(and(eq(usersTable.id, data.athleteId), eq(usersTable.coachId, req.user!.userId)));
      if (!linkedAthlete) {
        res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Athlete is not linked to this coach" } });
        return;
      }
    }

    const [program] = await db.update(programsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)))
      .returning();

    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const [athlete] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, program.athleteId));

    res.json({
      id: program.id,
      name: program.name,
      athleteId: program.athleteId,
      athleteName: `${athlete?.firstName ?? ""} ${athlete?.lastName ?? ""}`.trim(),
      durationWeeks: program.durationWeeks,
      startDate: program.startDate,
      isActive: program.isActive,
      createdAt: program.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

interface ExerciseInput {
  exerciseId: string;
  orderIndex: number;
  sets: number;
  reps?: string;
  loadKg?: number;
  restSeconds?: number;
  coachCue?: string;
}

function buildAutoVariants(normalExercises: ExerciseInput[]): Array<{
  mode: "performance" | "adapt" | "recovery";
  notes: string;
  exercises: ExerciseInput[];
}> {
  return [
    {
      mode: "performance",
      notes: "Auto-généré: charge ×1.05",
      exercises: normalExercises.map(ex => ({
        ...ex,
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 1.05) : ex.loadKg,
      })),
    },
    {
      mode: "adapt",
      notes: "Auto-généré: charge ×0.75, séries -1",
      exercises: normalExercises.map(ex => ({
        ...ex,
        sets: Math.max(2, (ex.sets ?? 3) - 1),
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 0.75) : ex.loadKg,
      })),
    },
    {
      mode: "recovery",
      notes: "Auto-généré: charge ×0.30, 2 séries",
      exercises: normalExercises.map(ex => ({
        ...ex,
        sets: 2,
        reps: "12-15",
        loadKg: ex.loadKg != null ? roundToHalf(ex.loadKg * 0.30) : ex.loadKg,
        restSeconds: 60,
        coachCue: "Mobilité et contrôle",
      })),
    },
  ];
}

const exerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  orderIndex: z.number().int(),
  sets: z.number().int(),
  reps: z.string().optional(),
  loadKg: z.number().optional(),
  restSeconds: z.number().int().optional(),
  coachCue: z.string().optional(),
  tempo: z.string().regex(/^\d-\d-\d-\d$/).optional(),
  blockId: z.string().uuid().optional(),
  supersetGroup: z.string().optional(),
  supersetLabel: z.string().optional(),
});

const blockInputSchema = z.object({
  type: z.enum(["warm_up", "strength", "power", "conditioning", "core", "cool_down"]),
  orderIndex: z.number().int(),
  name: z.string().optional(),
  notes: z.string().optional(),
  estimatedDurationMin: z.number().int().optional(),
  conditioningFormat: z.enum(["amrap", "emom", "for_time", "tabata"]).optional(),
  exercises: z.array(exerciseInputSchema).optional(),
});

const createSessionSchema = z.object({
  weekNumber: z.number().int().min(1),
  dayNumber: z.number().int().min(1),
  name: z.string().min(1),
  type: z.enum(ALL_SESSION_TYPES),
  sessionType: z.enum(["online", "presentiel"]).optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  visioLink: z.string().url().optional().nullable().or(z.literal("")),
  estimatedDurationMin: z.number().int().optional(),
  coachNotes: z.string().optional(),
  blocks: z.array(blockInputSchema).optional(),
  variants: z.array(z.object({
    mode: z.enum(["performance", "normal", "adapt", "recovery"]),
    notes: z.string().optional(),
    exercises: z.array(exerciseInputSchema).optional(),
  })).optional(),
});

router.post("/programs/:programId/sessions", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const programId = String(req.params["programId"]);

    const [program] = await db.select().from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found" } });
      return;
    }

    const [session] = await db.insert(sessionsTable).values({
      programId,
      weekNumber: parsed.data.weekNumber,
      dayNumber: parsed.data.dayNumber,
      name: parsed.data.name,
      type: parsed.data.type,
      sessionType: parsed.data.sessionType ?? "online",
      scheduledTime: parsed.data.scheduledTime ?? null,
      visioLink: parsed.data.visioLink || null,
      estimatedDurationMin: parsed.data.estimatedDurationMin,
      coachNotes: parsed.data.coachNotes,
    }).returning();

    // Create blocks and collect all exercises for variant creation
    const blockIdMap = new Map<number, string>(); // orderIndex -> blockId
    if (parsed.data.blocks && parsed.data.blocks.length > 0) {
      for (const block of parsed.data.blocks) {
        const [sb] = await db.insert(sessionBlocksTable).values({
          sessionId: session.id,
          type: block.type,
          orderIndex: block.orderIndex,
          name: block.name,
          notes: block.notes,
          estimatedDurationMin: block.estimatedDurationMin,
          conditioningFormat: block.conditioningFormat,
        }).returning();
        blockIdMap.set(block.orderIndex, sb.id);
      }
    }

    // Collect exercises from blocks (normal variant)
    let allBlockExercises: typeof exerciseInputSchema._type[] = [];
    if (parsed.data.blocks) {
      for (const block of parsed.data.blocks) {
        if (block.exercises) {
          for (const ex of block.exercises) {
            allBlockExercises.push({ ...ex, blockId: blockIdMap.get(block.orderIndex) });
          }
        }
      }
    }

    const allVariantsToCreate = parsed.data.variants ? [...parsed.data.variants] : [];

    // If blocks provided, synthesize a "normal" variant from block exercises (if no explicit variants)
    if (allBlockExercises.length > 0 && !allVariantsToCreate.find(v => v.mode === "normal")) {
      allVariantsToCreate.push({ mode: "normal", exercises: allBlockExercises });
    }

    const normalVariant = allVariantsToCreate.find(v => v.mode === "normal");
    if (normalVariant && normalVariant.exercises && normalVariant.exercises.length > 0) {
      const existingModes = new Set(allVariantsToCreate.map(v => v.mode));
      const autoVariants = buildAutoVariants(normalVariant.exercises);
      for (const av of autoVariants) {
        if (!existingModes.has(av.mode)) {
          allVariantsToCreate.push(av);
        }
      }
    }

    for (const variant of allVariantsToCreate) {
      const [sv] = await db.insert(sessionVariantsTable).values({
        sessionId: session.id,
        mode: variant.mode,
        notes: variant.notes,
      }).returning();

      if (variant.exercises) {
        for (const ex of variant.exercises) {
          await db.insert(sessionExercisesTable).values({
            variantId: sv.id,
            blockId: ex.blockId ?? null,
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex,
            sets: ex.sets,
            reps: ex.reps,
            loadKg: ex.loadKg != null ? ex.loadKg.toString() : undefined,
            restSeconds: ex.restSeconds,
            coachCue: ex.coachCue,
            tempo: ex.tempo ?? null,
            supersetGroup: ex.supersetGroup ?? null,
            supersetLabel: ex.supersetLabel ?? null,
          });
        }
      }
    }

    res.status(201).json({ success: true, sessionId: session.id, message: "Session added", autoVariantsGenerated: true });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/programs/:programId/sessions/:sessionId", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSessionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const programId = String(req.params["programId"]);
    const sessionId = String(req.params["sessionId"]);

    const [program] = await db.select({ id: programsTable.id }).from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Program not found or not authorized" } });
      return;
    }

    const [session] = await db.select({ id: sessionsTable.id }).from(sessionsTable)
      .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.programId, programId)));
    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found in this program" } });
      return;
    }

    const updateData: {
      name?: string;
      weekNumber?: number;
      dayNumber?: number;
      type?: string;
      sessionType?: string;
      scheduledTime?: string | null;
      visioLink?: string | null;
      estimatedDurationMin?: number;
      coachNotes?: string;
    } = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.weekNumber !== undefined) updateData.weekNumber = parsed.data.weekNumber;
    if (parsed.data.dayNumber !== undefined) updateData.dayNumber = parsed.data.dayNumber;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.sessionType !== undefined) updateData.sessionType = parsed.data.sessionType;
    if (parsed.data.scheduledTime !== undefined) updateData.scheduledTime = parsed.data.scheduledTime ?? null;
    if (parsed.data.visioLink !== undefined) updateData.visioLink = parsed.data.visioLink || null;
    if (parsed.data.estimatedDurationMin !== undefined) updateData.estimatedDurationMin = parsed.data.estimatedDurationMin;
    if (parsed.data.coachNotes !== undefined) updateData.coachNotes = parsed.data.coachNotes;

    if (Object.keys(updateData).length > 0) {
      await db.update(sessionsTable).set(updateData).where(eq(sessionsTable.id, sessionId));
    }

    const hasVariantOrBlockUpdate = parsed.data.variants !== undefined || parsed.data.blocks !== undefined;

    if (hasVariantOrBlockUpdate) {
      const existingVariants = await db.select({ id: sessionVariantsTable.id })
        .from(sessionVariantsTable)
        .where(eq(sessionVariantsTable.sessionId, sessionId));

      for (const v of existingVariants) {
        await db.delete(sessionExercisesTable).where(eq(sessionExercisesTable.variantId, v.id));
      }
      if (existingVariants.length > 0) {
        await db.delete(sessionVariantsTable)
          .where(inArray(sessionVariantsTable.id, existingVariants.map(v => v.id)));
      }

      // Delete and recreate blocks
      await db.delete(sessionBlocksTable).where(eq(sessionBlocksTable.sessionId, sessionId));

      const blockIdMap = new Map<number, string>();
      if (parsed.data.blocks && parsed.data.blocks.length > 0) {
        for (const block of parsed.data.blocks) {
          const [sb] = await db.insert(sessionBlocksTable).values({
            sessionId,
            type: block.type,
            orderIndex: block.orderIndex,
            name: block.name,
            notes: block.notes,
            estimatedDurationMin: block.estimatedDurationMin,
            conditioningFormat: block.conditioningFormat,
          }).returning();
          blockIdMap.set(block.orderIndex, sb.id);
        }
      }

      let allBlockExercises: typeof exerciseInputSchema._type[] = [];
      if (parsed.data.blocks) {
        for (const block of parsed.data.blocks) {
          if (block.exercises) {
            for (const ex of block.exercises) {
              allBlockExercises.push({ ...ex, blockId: blockIdMap.get(block.orderIndex) });
            }
          }
        }
      }

      const allVariantsToCreate = parsed.data.variants ? [...parsed.data.variants] : [];
      if (allBlockExercises.length > 0 && !allVariantsToCreate.find(v => v.mode === "normal")) {
        allVariantsToCreate.push({ mode: "normal", exercises: allBlockExercises });
      }

      const normalVariant = allVariantsToCreate.find(v => v.mode === "normal");
      if (normalVariant && normalVariant.exercises && normalVariant.exercises.length > 0) {
        const existingModes = new Set(allVariantsToCreate.map(v => v.mode));
        const autoVariants = buildAutoVariants(normalVariant.exercises);
        for (const av of autoVariants) {
          if (!existingModes.has(av.mode)) {
            allVariantsToCreate.push(av);
          }
        }
      }

      for (const variant of allVariantsToCreate) {
        const [sv] = await db.insert(sessionVariantsTable).values({
          sessionId,
          mode: variant.mode,
          notes: variant.notes,
        }).returning();

        if (variant.exercises) {
          for (const ex of variant.exercises) {
            await db.insert(sessionExercisesTable).values({
              variantId: sv.id,
              blockId: ex.blockId ?? null,
              exerciseId: ex.exerciseId,
              orderIndex: ex.orderIndex,
              sets: ex.sets,
              reps: ex.reps,
              loadKg: ex.loadKg != null ? ex.loadKg.toString() : undefined,
              restSeconds: ex.restSeconds,
              coachCue: ex.coachCue,
              tempo: ex.tempo ?? null,
              supersetGroup: ex.supersetGroup ?? null,
              supersetLabel: ex.supersetLabel ?? null,
            });
          }
        }
      }
    }

    res.json({ success: true, message: "Session updated", autoVariantsGenerated: hasVariantOrBlockUpdate });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/programs/:programId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programId = String(req.params["programId"]);

    // Verify ownership before deleting
    const [program] = await db.select({ id: programsTable.id }).from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Program not found or not authorized" } });
      return;
    }

    // Cascade: delete session exercises, variants, blocks, sessions, then program
    const sessions = await db.select({ id: sessionsTable.id }).from(sessionsTable)
      .where(eq(sessionsTable.programId, programId));
    const sessionIds = sessions.map(s => s.id);

    if (sessionIds.length > 0) {
      const variants = await db.select({ id: sessionVariantsTable.id }).from(sessionVariantsTable)
        .where(inArray(sessionVariantsTable.sessionId, sessionIds));
      const variantIds = variants.map(v => v.id);

      if (variantIds.length > 0) {
        await db.delete(sessionExercisesTable).where(inArray(sessionExercisesTable.variantId, variantIds));
        await db.delete(sessionVariantsTable).where(inArray(sessionVariantsTable.id, variantIds));
      }
      await db.delete(sessionBlocksTable).where(inArray(sessionBlocksTable.sessionId, sessionIds));
      await db.delete(sessionsTable).where(inArray(sessionsTable.id, sessionIds));
    }

    await db.delete(programsTable).where(eq(programsTable.id, programId));
    res.json({ success: true, message: "Program deleted" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// PATCH /programs/:programId/sessions/:sessionId/position — Move session to a new week/day (DnD)
router.patch("/programs/:programId/sessions/:sessionId/position", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programId = String(req.params["programId"]);
    const sessionId = String(req.params["sessionId"]);

    const schema = z.object({
      weekNumber: z.number().int().min(1),
      dayNumber: z.number().int().min(1).max(7),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "weekNumber et dayNumber sont requis" } });
      return;
    }
    const { weekNumber, dayNumber } = parsed.data;

    const [program] = await db.select({ id: programsTable.id, durationWeeks: programsTable.durationWeeks })
      .from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Programme introuvable ou non autorisé" } });
      return;
    }
    if (weekNumber > program.durationWeeks) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Semaine hors limites du programme" } });
      return;
    }

    const [session] = await db.select({ id: sessionsTable.id }).from(sessionsTable)
      .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.programId, programId)));
    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Séance introuvable dans ce programme" } });
      return;
    }

    await db.update(sessionsTable)
      .set({ weekNumber, dayNumber })
      .where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, weekNumber, dayNumber });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.delete("/programs/:programId/sessions/:sessionId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const programId = String(req.params["programId"]);
    const sessionId = String(req.params["sessionId"]);

    // Verify program belongs to coach
    const [program] = await db.select({ id: programsTable.id }).from(programsTable)
      .where(and(eq(programsTable.id, programId), eq(programsTable.coachId, req.user!.userId)));
    if (!program) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Program not found or not authorized" } });
      return;
    }

    // Verify session belongs to this program
    const [session] = await db.select({ id: sessionsTable.id }).from(sessionsTable)
      .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.programId, programId)));
    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found in this program" } });
      return;
    }

    // Delete exercises for all variants, then variants, then blocks, then session
    const variants = await db.select({ id: sessionVariantsTable.id }).from(sessionVariantsTable)
      .where(eq(sessionVariantsTable.sessionId, sessionId));

    for (const variant of variants) {
      await db.delete(sessionExercisesTable).where(eq(sessionExercisesTable.variantId, variant.id));
    }
    for (const variant of variants) {
      await db.delete(sessionVariantsTable).where(eq(sessionVariantsTable.id, variant.id));
    }
    await db.delete(sessionBlocksTable).where(eq(sessionBlocksTable.sessionId, sessionId));
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;

