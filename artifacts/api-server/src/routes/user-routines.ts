import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  userSessionTemplatesTable,
  exercisesTable,
  sessionLogsTable,
  checkinsTable,
  alertsTable,
} from "@workspace/db";
import { and, eq, desc, inArray } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { getTodayLocalDate } from "../lib/dateUtils.js";

const router: IRouter = Router();

const exerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(20),
  loadKg: z.number().nonnegative().nullable().optional(),
  restSeconds: z.number().int().min(0).max(600).nullable().optional(),
});

const templateBodySchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z.array(exerciseSchema).min(1).max(30),
});

router.get("/user-routines", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(userSessionTemplatesTable)
      .where(eq(userSessionTemplatesTable.athleteId, req.user!.userId))
      .orderBy(desc(userSessionTemplatesTable.updatedAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/user-routines", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = templateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [row] = await db
      .insert(userSessionTemplatesTable)
      .values({
        athleteId: req.user!.userId,
        name: parsed.data.name,
        exercises: parsed.data.exercises,
      })
      .returning();
    res.status(201).json(row);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/user-routines/:id", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const result = await db
      .delete(userSessionTemplatesTable)
      .where(and(
        eq(userSessionTemplatesTable.id, id),
        eq(userSessionTemplatesTable.athleteId, req.user!.userId),
      ))
      .returning({ id: userSessionTemplatesTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine not found" } });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/user-routines/:id/start-free", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const athleteId = req.user!.userId;

    const [tpl] = await db
      .select()
      .from(userSessionTemplatesTable)
      .where(and(
        eq(userSessionTemplatesTable.id, id),
        eq(userSessionTemplatesTable.athleteId, athleteId),
      ));

    if (!tpl) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Routine not found" } });
      return;
    }

    const exerciseIds = tpl.exercises.map((e) => e.exerciseId);
    const dbExs = exerciseIds.length
      ? await db
          .select({
            id: exercisesTable.id,
            name: exercisesTable.name,
            category: exercisesTable.category,
            muscleGroups: exercisesTable.muscleGroups,
            equipment: exercisesTable.equipment,
            description: exercisesTable.description,
            demoUrl: exercisesTable.demoUrl,
            demoGifUrl: exercisesTable.demoGifUrl,
          })
          .from(exercisesTable)
          .where(inArray(exercisesTable.id, exerciseIds))
      : [];
    const exMap = new Map(dbExs.map((e) => [e.id, e]));

    const today = getTodayLocalDate();
    const [todayCheckin] = await db
      .select()
      .from(checkinsTable)
      .where(and(eq(checkinsTable.athleteId, athleteId), eq(checkinsTable.date, today)));

    const painAlerts = todayCheckin
      ? await db
          .select({ id: alertsTable.id })
          .from(alertsTable)
          .where(and(
            eq(alertsTable.athleteId, athleteId),
            eq(alertsTable.type, "pain"),
            eq(alertsTable.isResolved, false),
          ))
      : [];

    const mode = painAlerts.length > 0 ? "recovery" : (todayCheckin?.sessionMode ?? "normal");

    const [log] = await db
      .insert(sessionLogsTable)
      .values({
        athleteId,
        sessionId: null,
        variantMode: mode,
        checkinId: todayCheckin?.id ?? null,
        startedAt: new Date(),
        isFreeSession: true,
        freeSessionName: tpl.name,
      })
      .returning();

    const exercises = tpl.exercises.map((tplEx, i) => {
      const dbEx = exMap.get(tplEx.exerciseId);
      return {
        id: `${log!.id}:${tplEx.exerciseId}:${i}`,
        exerciseId: tplEx.exerciseId,
        exerciseName: dbEx?.name ?? tplEx.exerciseName,
        category: dbEx?.category ?? null,
        imageUrl: dbEx?.demoUrl ?? null,
        gifUrl: dbEx?.demoGifUrl ?? null,
        muscleGroups: dbEx?.muscleGroups ?? null,
        equipment: dbEx?.equipment ?? null,
        description: dbEx?.description ?? null,
        demoUrl: dbEx?.demoUrl ?? null,
        orderIndex: i,
        sets: tplEx.sets,
        reps: tplEx.reps,
        nominalLoadKg: tplEx.loadKg ?? null,
        adaptedLoadKg: tplEx.loadKg ?? null,
        restSeconds: tplEx.restSeconds ?? null,
        durationSeconds: null,
        coachCue: null,
        tempo: null,
        lastUsedLoadKg: null,
        lastUsedDate: null,
        lastUsedRepsPerSet: null,
        blockId: null,
      };
    });

    res.json({
      sessionLogId: log!.id,
      name: tpl.name,
      mode,
      adaptScore: todayCheckin?.adaptScore ?? 50,
      coachNotes: null,
      estimatedDurationMin: null,
      exercises,
      athletePRs: {},
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
