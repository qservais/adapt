import { Router } from "express";
import { db } from "@workspace/db";
import { studioSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const DEFAULTS = {
  studioName: "Mouv'Up",
  studioAddress: null as string | null,
  whatsappNumber: null as string | null,
  announcementLink: null as string | null,
  defaultCancellationWindowHours: 24,
  vatRegime: "franchise" as const,
  vatNumber: null as string | null,
  invoicePrefix: "NH",
  accountantEmail: null as string | null,
};

router.get("/studio-settings", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const [row] = await db.select().from(studioSettingsTable).where(eq(studioSettingsTable.coachId, coachId));
    if (!row) {
      // No row yet — surface sane defaults without writing anything on a GET.
      res.json({ coachId, ...DEFAULTS });
      return;
    }
    res.json(row);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const updateSettingsSchema = z.object({
  studioName: z.string().min(1).max(150).optional(),
  studioAddress: z.string().max(500).nullable().optional(),
  whatsappNumber: z.string().max(30).nullable().optional(),
  announcementLink: z.string().url().max(500).nullable().optional(),
  defaultCancellationWindowHours: z.number().int().min(1).max(168).optional(),
  vatRegime: z.enum(["franchise", "assujetti"]).optional(),
  vatNumber: z.string().max(30).nullable().optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
  accountantEmail: z.string().email().nullable().optional(),
});

router.put("/studio-settings", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const coachId = req.user!.userId;
    const [row] = await db
      .insert(studioSettingsTable)
      .values({ coachId, ...DEFAULTS, ...parsed.data })
      .onConflictDoUpdate({
        target: studioSettingsTable.coachId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
