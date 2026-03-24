import { Router } from "express";
import { db } from "@workspace/db";
import { mealLogsTable, nutritionGoalsTable, nutritionPdfsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { z } from "zod";

const router = Router();
const storage = new ObjectStorageService();

const mealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().optional().nullable(),
  proteinG: z.number().int().min(0).default(0),
  carbsG: z.number().int().min(0).default(0),
  fatG: z.number().int().min(0).default(0),
  kcal: z.number().int().min(0).default(0),
});

const goalsSchema = z.object({
  proteinG: z.number().int().min(0),
  carbsG: z.number().int().min(0),
  fatG: z.number().int().min(0),
  kcal: z.number().int().min(0),
});

router.get("/nutrition/meals", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    let q = db
      .select()
      .from(mealLogsTable)
      .where(
        date
          ? and(eq(mealLogsTable.userId, userId), eq(mealLogsTable.date, date))
          : eq(mealLogsTable.userId, userId)
      )
      .orderBy(desc(mealLogsTable.date), desc(mealLogsTable.createdAt));

    const meals = await q;
    return res.json(meals);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/nutrition/meals", authenticate, async (req, res) => {
  try {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const { date, mealType, description, proteinG, carbsG, fatG, kcal } = parsed.data;
    const [meal] = await db.insert(mealLogsTable).values({
      userId: req.user!.userId,
      date,
      mealType,
      description: description ?? null,
      proteinG,
      carbsG,
      fatG,
      kcal,
    }).returning();
    return res.status(201).json(meal);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/nutrition/meals/:id", authenticate, async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const [deleted] = await db
      .delete(mealLogsTable)
      .where(and(eq(mealLogsTable.id, id), eq(mealLogsTable.userId, userId)))
      .returning({ id: mealLogsTable.id });
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Repas introuvable" } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/nutrition/goals", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId));
    if (!goals) {
      return res.json({ proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 });
    }
    return res.json(goals);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/nutrition/goals", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const parsed = goalsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const { proteinG, carbsG, fatG, kcal } = parsed.data;
    const [existing] = await db.select({ userId: nutritionGoalsTable.userId }).from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId));
    let goals;
    if (existing) {
      [goals] = await db
        .update(nutritionGoalsTable)
        .set({ proteinG, carbsG, fatG, kcal, updatedAt: new Date() })
        .where(eq(nutritionGoalsTable.userId, userId))
        .returning();
    } else {
      [goals] = await db
        .insert(nutritionGoalsTable)
        .values({ userId, proteinG, carbsG, fatG, kcal })
        .returning();
    }
    return res.json(goals);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/nutrition/pdfs", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const pdfs = await db
      .select()
      .from(nutritionPdfsTable)
      .where(eq(nutritionPdfsTable.athleteId, userId))
      .orderBy(desc(nutritionPdfsTable.uploadedAt));
    return res.json(pdfs);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/nutrition/meals/upload-url", authenticate, async (req, res) => {
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    return res.json({ uploadURL });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:athleteId/nutrition/goals", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const [goals] = await db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, athleteId));
    return res.json(goals ?? { proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/clients/:athleteId/nutrition/goals", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const parsed = goalsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const { proteinG, carbsG, fatG, kcal } = parsed.data;
    const [existing] = await db.select({ userId: nutritionGoalsTable.userId }).from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, athleteId));
    let goals;
    if (existing) {
      [goals] = await db.update(nutritionGoalsTable).set({ proteinG, carbsG, fatG, kcal, updatedAt: new Date() }).where(eq(nutritionGoalsTable.userId, athleteId)).returning();
    } else {
      [goals] = await db.insert(nutritionGoalsTable).values({ userId: athleteId, proteinG, carbsG, fatG, kcal }).returning();
    }
    return res.json(goals);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:athleteId/nutrition/goals", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const [goals] = await db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, athleteId));
    return res.json(goals ?? { proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:athleteId/nutrition/meals", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const meals = await db.select().from(mealLogsTable).where(eq(mealLogsTable.userId, athleteId)).orderBy(desc(mealLogsTable.date), desc(mealLogsTable.createdAt)).limit(50);
    return res.json(meals);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/clients/:athleteId/nutrition/pdfs/upload-url", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const uploadUrl = await storage.getObjectEntityUploadURL();
    const urlObj = new URL(uploadUrl);
    const objectPath = urlObj.pathname;
    const metadataEndpoint = `/api/coach/clients/${athleteId}/nutrition/pdfs`;
    return res.json({ uploadUrl, objectPath, metadataEndpoint });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const pdfMetaSchema = z.object({
  title: z.string().min(1).max(200),
  objectPath: z.string().min(1),
});

router.post("/coach/clients/:athleteId/nutrition/pdfs", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const parsed = pdfMetaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    const normalizedPath = storage.normalizeObjectEntityPath(parsed.data.objectPath);
    const [pdf] = await db.insert(nutritionPdfsTable).values({
      coachId,
      athleteId,
      title: parsed.data.title,
      objectPath: normalizedPath,
    }).returning();
    return res.status(201).json(pdf);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:athleteId/nutrition/pdfs", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const coachId = req.user!.userId;
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const pdfs = await db.select().from(nutritionPdfsTable).where(and(eq(nutritionPdfsTable.athleteId, athleteId), eq(nutritionPdfsTable.coachId, coachId))).orderBy(desc(nutritionPdfsTable.uploadedAt));
    return res.json(pdfs);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/clients/:athleteId/nutrition/pdfs/:pdfId", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const athleteId = String(req.params.athleteId);
    const pdfId = String(req.params.pdfId);
    const coachId = req.user!.userId;
    const [deleted] = await db
      .delete(nutritionPdfsTable)
      .where(and(eq(nutritionPdfsTable.id, pdfId), eq(nutritionPdfsTable.coachId, coachId), eq(nutritionPdfsTable.athleteId, athleteId)))
      .returning({ id: nutritionPdfsTable.id });
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF introuvable" } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/nutrition/pdfs/:id/download", authenticate, async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const [pdf] = await db.select().from(nutritionPdfsTable).where(eq(nutritionPdfsTable.id, id));
    if (!pdf) return res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF introuvable" } });
    if (pdf.athleteId !== userId && pdf.coachId !== req.user!.userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    }
    const file = await storage.getObjectEntityFile(pdf.objectPath);
    const response = await storage.downloadObject(file);
    const contentType = response.headers.get("content-type") ?? "application/pdf";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${pdf.title}.pdf"`);
    if (!response.body) {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Impossible de lire le fichier" } });
    }
    const { Readable } = await import("stream");
    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
    return;
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
