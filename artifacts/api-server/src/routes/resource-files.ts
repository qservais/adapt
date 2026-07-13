import { Router } from "express";
import { db } from "@workspace/db";
import { resourceFilesTable, usersTable } from "@workspace/db";
import type { ResourceFile } from "@workspace/db";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { z } from "zod";

const router = Router();
const storage = new ObjectStorageService();

async function resolveCoachId(userId: string, role: string): Promise<string | null> {
  if (role === "coach") return userId;
  const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, userId));
  return athlete?.coachId ?? null;
}

router.post("/coach/resource-files/upload-url", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const uploadUrl = await storage.getObjectEntityUploadURL();
    const urlPathname = new URL(uploadUrl).pathname;
    const uploadsIndex = urlPathname.indexOf("/uploads/");
    if (uploadsIndex === -1) {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Format d'URL de stockage inattendu" } });
    }
    const objectPath = `/objects${urlPathname.slice(uploadsIndex)}`.split("?")[0];
    return res.json({ uploadUrl, objectPath, metadataEndpoint: "/api/coach/resource-files" });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  objectPath: z.string().min(1),
  // null = shared with every athlete of this coach
  athleteId: z.string().uuid().nullable(),
});

router.post("/coach/resource-files", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
  }
  try {
    const coachId = req.user!.userId;
    if (parsed.data.athleteId) {
      const [athlete] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, coachId)));
      if (!athlete) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Athlète introuvable ou non associé" } });
      }
    }
    const normalizedPath = storage.normalizeObjectEntityPath(parsed.data.objectPath);
    if (!normalizedPath.startsWith("/objects/uploads/")) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Chemin d'objet invalide" } });
    }
    const [file] = await db
      .insert(resourceFilesTable)
      .values({
        coachId,
        athleteId: parsed.data.athleteId,
        title: parsed.data.title,
        objectPath: normalizedPath,
      })
      .returning();
    return res.status(201).json({ ...file, uploadedAt: file.uploadedAt.toISOString() });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/resource-files", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athleteIdFilter = req.query["athleteId"] ? String(req.query["athleteId"]) : null;
    const files = await db
      .select()
      .from(resourceFilesTable)
      .where(
        athleteIdFilter
          ? and(
              eq(resourceFilesTable.coachId, coachId),
              or(eq(resourceFilesTable.athleteId, athleteIdFilter), isNull(resourceFilesTable.athleteId))
            )
          : eq(resourceFilesTable.coachId, coachId)
      )
      .orderBy(desc(resourceFilesTable.uploadedAt));
    return res.json(files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() })));
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/resource-files/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [deleted] = await db
      .delete(resourceFilesTable)
      .where(and(eq(resourceFilesTable.id, id), eq(resourceFilesTable.coachId, coachId)))
      .returning({ id: resourceFilesTable.id });
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Fichier introuvable" } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/resource-files", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const coachId = await resolveCoachId(userId, req.user!.role);
    if (!coachId) return res.json([]);
    const files = await db
      .select()
      .from(resourceFilesTable)
      .where(
        and(
          eq(resourceFilesTable.coachId, coachId),
          or(eq(resourceFilesTable.athleteId, userId), isNull(resourceFilesTable.athleteId))
        )
      )
      .orderBy(desc(resourceFilesTable.uploadedAt));
    return res.json(files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() })));
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

type FileAccessResult =
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "ok"; file: ResourceFile };

async function checkFileAccess(fileId: string, userId: string, role: string): Promise<FileAccessResult> {
  const [file] = await db.select().from(resourceFilesTable).where(eq(resourceFilesTable.id, fileId));
  if (!file) return { status: "not_found" };
  if (file.coachId === userId || file.athleteId === userId) return { status: "ok", file };
  const coachId = await resolveCoachId(userId, role);
  if (file.athleteId === null && coachId === file.coachId) return { status: "ok", file };
  return { status: "forbidden" };
}

router.get("/resource-files/:id/signed-url", authenticate, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const access = await checkFileAccess(id, req.user!.userId, req.user!.role);
    if (access.status === "not_found") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Fichier introuvable" } });
    if (access.status === "forbidden") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const signedUrl = await storage.getObjectEntitySignedDownloadUrl(access.file.objectPath, 900);
    return res.json({ signedUrl });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/resource-files/:id/download", authenticate, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const access = await checkFileAccess(id, req.user!.userId, req.user!.role);
    if (access.status === "not_found") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Fichier introuvable" } });
    if (access.status === "forbidden") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
    const file = access.file;
    const entityFile = await storage.getObjectEntityFile(file.objectPath);
    const response = await storage.downloadObject(entityFile);
    const contentType = response.headers.get("content-type") ?? "application/pdf";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.title}.pdf"`);
    if (!response.body) {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Impossible de lire le fichier" } });
    }
    const { Readable } = await import("stream");
    const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    nodeStream.pipe(res);
    return;
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
