import { Router } from "express";
import { db } from "@workspace/db";
import { scheduledNotificationsTable, usersTable } from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  // null = broadcast to every athlete of this coach
  athleteId: z.string().uuid().nullable(),
  message: z.string().min(1).max(1000),
  recurrenceType: z.enum(["daily", "weekly", "custom"]).default("daily"),
  recurrenceConfig: z.record(z.unknown()).default({}),
  sendHour: z.number().int().min(0).max(23).default(8),
}).refine(
  (d) => {
    if (d.recurrenceType === "daily") return true;
    const days = d.recurrenceConfig["days"];
    return Array.isArray(days) && days.length > 0;
  },
  { message: "Sélectionnez au moins un jour pour la récurrence hebdomadaire ou personnalisée." }
);

const updateSchema = z.object({
  message: z.string().min(1).max(1000).optional(),
  recurrenceType: z.enum(["daily", "weekly", "custom"]).optional(),
  recurrenceConfig: z.record(z.unknown()).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  active: z.boolean().optional(),
}).refine(
  (d) => {
    if (!d.recurrenceType || d.recurrenceType === "daily") return true;
    if (!d.recurrenceConfig) return true;
    const days = d.recurrenceConfig["days"];
    return Array.isArray(days) && days.length > 0;
  },
  { message: "Sélectionnez au moins un jour pour la récurrence hebdomadaire ou personnalisée." }
);

const morningHourSchema = z.object({
  hour: z.number().int().min(0).max(23),
});

router.get("/coach/scheduled-notifications", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athleteIdFilter = req.query["athleteId"] ? String(req.query["athleteId"]) : null;

    let query = db
      .select({
        id: scheduledNotificationsTable.id,
        coachId: scheduledNotificationsTable.coachId,
        athleteId: scheduledNotificationsTable.athleteId,
        message: scheduledNotificationsTable.message,
        recurrenceType: scheduledNotificationsTable.recurrenceType,
        recurrenceConfig: scheduledNotificationsTable.recurrenceConfig,
        sendHour: scheduledNotificationsTable.sendHour,
        active: scheduledNotificationsTable.active,
        createdAt: scheduledNotificationsTable.createdAt,
        updatedAt: scheduledNotificationsTable.updatedAt,
        athleteFirstName: usersTable.firstName,
        athleteLastName: usersTable.lastName,
      })
      .from(scheduledNotificationsTable)
      .leftJoin(usersTable, eq(scheduledNotificationsTable.athleteId, usersTable.id))
      .where(
        athleteIdFilter
          ? and(
              eq(scheduledNotificationsTable.coachId, coachId),
              // A broadcast (athleteId=null) reminder applies to this
              // athlete too, so it belongs in their filtered view.
              or(
                eq(scheduledNotificationsTable.athleteId, athleteIdFilter),
                isNull(scheduledNotificationsTable.athleteId)
              )
            )
          : eq(scheduledNotificationsTable.coachId, coachId)
      )
      .$dynamic();

    const rows = await query;
    res.json(rows.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? null,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/scheduled-notifications", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    if (parsed.data.athleteId) {
      const [athlete] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, coachId)));
      if (!athlete) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Athlète introuvable ou non associé" } });
        return;
      }
    }
    const [row] = await db
      .insert(scheduledNotificationsTable)
      .values({
        coachId,
        athleteId: parsed.data.athleteId,
        message: parsed.data.message,
        recurrenceType: parsed.data.recurrenceType,
        recurrenceConfig: parsed.data.recurrenceConfig,
        sendHour: parsed.data.sendHour,
      })
      .returning();
    res.status(201).json({ ...row, createdAt: row.createdAt?.toISOString() ?? null, updatedAt: row.updatedAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/scheduled-notifications/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: scheduledNotificationsTable.id })
      .from(scheduledNotificationsTable)
      .where(and(eq(scheduledNotificationsTable.id, id), eq(scheduledNotificationsTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification introuvable" } });
      return;
    }
    const updates: Partial<typeof scheduledNotificationsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.message !== undefined) updates.message = parsed.data.message;
    if (parsed.data.recurrenceType !== undefined) updates.recurrenceType = parsed.data.recurrenceType;
    if (parsed.data.recurrenceConfig !== undefined) updates.recurrenceConfig = parsed.data.recurrenceConfig;
    if (parsed.data.sendHour !== undefined) updates.sendHour = parsed.data.sendHour;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    const [row] = await db
      .update(scheduledNotificationsTable)
      .set(updates)
      .where(eq(scheduledNotificationsTable.id, id))
      .returning();
    res.json({ ...row, createdAt: row.createdAt?.toISOString() ?? null, updatedAt: row.updatedAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/scheduled-notifications/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: scheduledNotificationsTable.id })
      .from(scheduledNotificationsTable)
      .where(and(eq(scheduledNotificationsTable.id, id), eq(scheduledNotificationsTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification introuvable" } });
      return;
    }
    await db.delete(scheduledNotificationsTable).where(eq(scheduledNotificationsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/morning-notif-hour", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const [coach] = await db
      .select({ morningNotifHour: usersTable.morningNotifHour })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ hour: coach?.morningNotifHour ?? 7 });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/morning-notif-hour", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = morningHourSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    await db
      .update(usersTable)
      .set({ morningNotifHour: parsed.data.hour })
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ hour: parsed.data.hour });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
