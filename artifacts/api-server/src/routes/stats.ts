import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessionLogsTable,
  exerciseLogsTable,
  exercisesTable,
  bodyMetricsTable,
} from "@workspace/db";
import { eq, and, desc, gte, asc, isNotNull, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import { objectStorageClient } from "../lib/objectStorage.js";

const router = Router();

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont acceptées"));
  },
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0]!;
}

router.get("/stats/exercise-load-history", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const days = Math.min(parseInt(String(req.query["days"] ?? "30")), 365);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const logs = await db
      .select({
        exerciseId: exerciseLogsTable.exerciseId,
        exerciseName: exercisesTable.name,
        loadKgUsed: exerciseLogsTable.loadKgUsed,
        createdAt: exerciseLogsTable.createdAt,
      })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .innerJoin(exercisesTable, eq(exerciseLogsTable.exerciseId, exercisesTable.id))
      .where(
        and(
          eq(sessionLogsTable.athleteId, athleteId),
          isNotNull(exerciseLogsTable.loadKgUsed),
          isNotNull(sessionLogsTable.completedAt),
          gte(sessionLogsTable.completedAt, cutoff),
        )
      )
      .orderBy(asc(exerciseLogsTable.createdAt));

    const byExercise: Record<string, { exerciseId: string; exerciseName: string; points: { date: string; loadKg: number }[] }> = {};
    for (const log of logs) {
      if (!log.loadKgUsed || !log.createdAt) continue;
      const loadKg = parseFloat(log.loadKgUsed);
      if (isNaN(loadKg) || loadKg <= 0) continue;
      if (!byExercise[log.exerciseId]) {
        byExercise[log.exerciseId] = {
          exerciseId: log.exerciseId,
          exerciseName: log.exerciseName,
          points: [],
        };
      }
      byExercise[log.exerciseId]!.points.push({
        date: new Date(log.createdAt).toISOString().split("T")[0]!,
        loadKg,
      });
    }

    const result = Object.values(byExercise).filter(e => e.points.length >= 1);
    res.json({ exercises: result });
  } catch (err) {
    console.error("exercise-load-history error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/stats/weekly-volume", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const weeks = Math.min(parseInt(String(req.query["weeks"] ?? "8")), 26);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);

    const logs = await db
      .select({
        setsCompleted: exerciseLogsTable.setsCompleted,
        repsPerSet: exerciseLogsTable.repsPerSet,
        loadKgUsed: exerciseLogsTable.loadKgUsed,
        completedAt: sessionLogsTable.completedAt,
      })
      .from(exerciseLogsTable)
      .innerJoin(sessionLogsTable, eq(exerciseLogsTable.sessionLogId, sessionLogsTable.id))
      .where(
        and(
          eq(sessionLogsTable.athleteId, athleteId),
          isNotNull(sessionLogsTable.completedAt),
          gte(sessionLogsTable.completedAt, cutoff),
        )
      );

    const weeklyVolume: Record<string, number> = {};
    const weeklySessionCount: Record<string, number> = {};

    const sessionsByWeek: Record<string, Set<string>> = {};

    for (const log of logs) {
      if (!log.completedAt) continue;
      const weekStart = getWeekStart(new Date(log.completedAt));

      if (!weeklyVolume[weekStart]) weeklyVolume[weekStart] = 0;

      const load = log.loadKgUsed ? parseFloat(log.loadKgUsed) : 0;
      const sets = log.setsCompleted ?? 1;
      let totalReps = 0;
      if (Array.isArray(log.repsPerSet)) {
        totalReps = (log.repsPerSet as number[]).reduce((a, b) => a + (b || 0), 0);
      } else {
        totalReps = sets * 8;
      }

      if (load > 0) {
        weeklyVolume[weekStart]! += totalReps * load;
      }
    }

    const allSessionLogs = await db
      .select({
        id: sessionLogsTable.id,
        completedAt: sessionLogsTable.completedAt,
      })
      .from(sessionLogsTable)
      .where(
        and(
          eq(sessionLogsTable.athleteId, athleteId),
          isNotNull(sessionLogsTable.completedAt),
          gte(sessionLogsTable.completedAt, cutoff),
        )
      );

    for (const s of allSessionLogs) {
      if (!s.completedAt) continue;
      const weekStart = getWeekStart(new Date(s.completedAt));
      if (!weeklySessionCount[weekStart]) weeklySessionCount[weekStart] = 0;
      weeklySessionCount[weekStart]!++;
    }

    const now = new Date();
    const result: Array<{ weekStart: string; volume: number; sessions: number }> = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const d = new Date(now);
      d.setDate(d.getDate() - w * 7);
      const weekStart = getWeekStart(d);
      result.push({
        weekStart,
        volume: Math.round(weeklyVolume[weekStart] ?? 0),
        sessions: weeklySessionCount[weekStart] ?? 0,
      });
    }

    res.json({ weeks: result });
  } catch (err) {
    console.error("weekly-volume error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/stats/week-comparison", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const now = new Date();
    const thisWeekStart = new Date(now);
    const day = thisWeekStart.getUTCDay();
    thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - (day === 0 ? 6 : day - 1));
    thisWeekStart.setUTCHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const [thisWeekSessions, lastWeekSessions] = await Promise.all([
      db.select({
        rpe: sessionLogsTable.rpe,
        startedAt: sessionLogsTable.startedAt,
        completedAt: sessionLogsTable.completedAt,
      }).from(sessionLogsTable).where(
        and(eq(sessionLogsTable.athleteId, athleteId), gte(sessionLogsTable.completedAt, thisWeekStart), isNotNull(sessionLogsTable.completedAt))
      ),
      db.select({
        rpe: sessionLogsTable.rpe,
        startedAt: sessionLogsTable.startedAt,
        completedAt: sessionLogsTable.completedAt,
      }).from(sessionLogsTable).where(
        and(eq(sessionLogsTable.athleteId, athleteId), gte(sessionLogsTable.completedAt, lastWeekStart), isNotNull(sessionLogsTable.completedAt))
      ).then(rows => rows.filter(r => r.completedAt && new Date(r.completedAt) < thisWeekStart)),
    ]);

    function summarize(sessions: typeof thisWeekSessions) {
      const count = sessions.length;
      const rpeSessions = sessions.filter(s => s.rpe != null);
      const avgRpe = rpeSessions.length > 0 ? rpeSessions.reduce((a, s) => a + (s.rpe ?? 0), 0) / rpeSessions.length : null;
      const totalDurationMin = sessions.reduce((a, s) => {
        if (s.startedAt && s.completedAt) {
          return a + Math.max(0, Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 60000));
        }
        return a;
      }, 0);
      return { sessions: count, avgRpe, totalDurationMin };
    }

    const thisWeek = summarize(thisWeekSessions);
    const lastWeek = summarize(lastWeekSessions);

    res.json({ thisWeek, lastWeek });
  } catch (err) {
    console.error("week-comparison error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.get("/stats/body-metrics", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const limit = Math.min(parseInt(String(req.query["limit"] ?? "30")), 100);
    const metrics = await db
      .select()
      .from(bodyMetricsTable)
      .where(eq(bodyMetricsTable.athleteId, athleteId))
      .orderBy(desc(bodyMetricsTable.date))
      .limit(limit);
    res.json({ metrics });
  } catch (err) {
    console.error("body-metrics GET error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

const insertBodyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(20).max(500).nullable().optional(),
  waistCm: z.number().min(30).max(300).nullable().optional(),
  hipsCm: z.number().min(30).max(300).nullable().optional(),
  chestCm: z.number().min(30).max(300).nullable().optional(),
  armCm: z.number().min(10).max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

router.post("/stats/body-metrics", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = insertBodyMetricSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const athleteId = req.user!.userId;
    const data = parsed.data;
    const [metric] = await db.insert(bodyMetricsTable).values({
      athleteId,
      date: data.date,
      weightKg: data.weightKg != null ? data.weightKg.toString() : null,
      waistCm: data.waistCm != null ? data.waistCm.toString() : null,
      hipsCm: data.hipsCm != null ? data.hipsCm.toString() : null,
      chestCm: data.chestCm != null ? data.chestCm.toString() : null,
      armCm: data.armCm != null ? data.armCm.toString() : null,
      notes: data.notes ?? null,
    }).returning();
    res.json({ metric });
  } catch (err) {
    console.error("body-metrics POST error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.delete("/stats/body-metrics/:id", authenticate, requireRole("athlete"), async (req, res) => {
  const id = String(req.params["id"]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Métrique introuvable" } });
    return;
  }
  try {
    await db.delete(bodyMetricsTable).where(
      and(eq(bodyMetricsTable.id, id), eq(bodyMetricsTable.athleteId, req.user!.userId))
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

router.post(
  "/stats/body-metrics/:id/photo",
  authenticate,
  requireRole("athlete"),
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: { code: "FILE_TOO_LARGE", message: "Max 10 MB" } });
        return;
      }
      if (err) {
        res.status(400).json({ error: { code: "UPLOAD_ERROR", message: err.message } });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const id = String(req.params["id"]);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Métrique introuvable" } });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: { code: "NO_FILE", message: "Aucune photo fournie" } });
      return;
    }
    try {
      const athleteId = req.user!.userId;
      const [existing] = await db.select({ id: bodyMetricsTable.id }).from(bodyMetricsTable)
        .where(and(eq(bodyMetricsTable.id, id), eq(bodyMetricsTable.athleteId, athleteId)));
      if (!existing) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Métrique introuvable" } });
        return;
      }

      const objectName = `body-metrics/${athleteId}/${id}.jpg`;
      const compressed = await sharp(req.file.buffer)
        .resize(1200, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      if (BUCKET_ID) {
        const bucket = objectStorageClient.bucket(BUCKET_ID);
        const file = bucket.file(objectName);
        await new Promise<void>((resolve, reject) => {
          const stream = file.createWriteStream({ contentType: "image/jpeg" });
          stream.on("finish", resolve);
          stream.on("error", reject);
          stream.end(compressed);
        });
        await db.update(bodyMetricsTable).set({ photoUrl: objectName }).where(eq(bodyMetricsTable.id, id));
        res.json({ success: true, photoUrl: `/api/stats/body-metrics/${id}/photo` });
      } else {
        res.status(503).json({ error: { code: "STORAGE_UNAVAILABLE", message: "Stockage non configuré" } });
      }
    } catch (err) {
      console.error("body-metrics photo error:", err);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
    }
  }
);

router.get("/stats/body-metrics/:id/photo", authenticate, requireRole("athlete"), async (req, res) => {
  const id = String(req.params["id"]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    res.status(404).end();
    return;
  }
  try {
    const athleteId = req.user!.userId;
    const [metric] = await db.select({ photoUrl: bodyMetricsTable.photoUrl, athleteId: bodyMetricsTable.athleteId })
      .from(bodyMetricsTable)
      .where(and(eq(bodyMetricsTable.id, id), eq(bodyMetricsTable.athleteId, athleteId)));
    if (!metric?.photoUrl) {
      res.status(404).end();
      return;
    }
    if (!BUCKET_ID) {
      res.status(404).end();
      return;
    }
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const file = bucket.file(metric.photoUrl);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).end();
      return;
    }
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    file.createReadStream().pipe(res);
  } catch (err) {
    res.status(500).end();
  }
});

export default router;
