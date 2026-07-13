import { Router } from "express";
import { db } from "@workspace/db";
import { coachAppointmentsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, lt } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const appointmentSchema = z.object({
  athleteId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(5).max(480).default(60),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const updateSchema = appointmentSchema.partial().omit({ athleteId: true });

router.get("/coach/appointments", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const yearQ = req.query["year"] ? parseInt(String(req.query["year"])) : null;
    const monthQ = req.query["month"] ? parseInt(String(req.query["month"])) : null;

    let rows;
    if (yearQ && monthQ && monthQ >= 1 && monthQ <= 12) {
      const monthStart = new Date(yearQ, monthQ - 1, 1);
      const monthEnd = new Date(yearQ, monthQ, 1);
      rows = await db
        .select({
          id: coachAppointmentsTable.id,
          coachId: coachAppointmentsTable.coachId,
          athleteId: coachAppointmentsTable.athleteId,
          startAt: coachAppointmentsTable.startAt,
          durationMin: coachAppointmentsTable.durationMin,
          location: coachAppointmentsTable.location,
          notes: coachAppointmentsTable.notes,
          type: coachAppointmentsTable.type,
          createdAt: coachAppointmentsTable.createdAt,
          athleteFirstName: usersTable.firstName,
          athleteLastName: usersTable.lastName,
        })
        .from(coachAppointmentsTable)
        .leftJoin(usersTable, eq(coachAppointmentsTable.athleteId, usersTable.id))
        .where(
          and(
            eq(coachAppointmentsTable.coachId, coachId),
            gte(coachAppointmentsTable.startAt, monthStart),
            lt(coachAppointmentsTable.startAt, monthEnd)
          )
        );
    } else {
      rows = await db
        .select({
          id: coachAppointmentsTable.id,
          coachId: coachAppointmentsTable.coachId,
          athleteId: coachAppointmentsTable.athleteId,
          startAt: coachAppointmentsTable.startAt,
          durationMin: coachAppointmentsTable.durationMin,
          location: coachAppointmentsTable.location,
          notes: coachAppointmentsTable.notes,
          type: coachAppointmentsTable.type,
          createdAt: coachAppointmentsTable.createdAt,
          athleteFirstName: usersTable.firstName,
          athleteLastName: usersTable.lastName,
        })
        .from(coachAppointmentsTable)
        .leftJoin(usersTable, eq(coachAppointmentsTable.athleteId, usersTable.id))
        .where(eq(coachAppointmentsTable.coachId, coachId));
    }

    res.json(rows.map((r) => ({
      ...r,
      startAt: r.startAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/appointments", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const [athlete] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, coachId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Athlète introuvable ou non associé" } });
      return;
    }
    const [row] = await db
      .insert(coachAppointmentsTable)
      .values({
        coachId,
        athleteId: parsed.data.athleteId,
        startAt: new Date(parsed.data.startAt),
        durationMin: parsed.data.durationMin,
        location: parsed.data.location,
        notes: parsed.data.notes,
      })
      .returning();
    res.status(201).json({ ...row, startAt: row.startAt.toISOString(), createdAt: row.createdAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/appointments/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: coachAppointmentsTable.id })
      .from(coachAppointmentsTable)
      .where(and(eq(coachAppointmentsTable.id, id), eq(coachAppointmentsTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "RDV introuvable" } });
      return;
    }
    const updates: Partial<typeof coachAppointmentsTable.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.startAt !== undefined) updates.startAt = new Date(parsed.data.startAt);
    if (parsed.data.durationMin !== undefined) updates.durationMin = parsed.data.durationMin;
    if (parsed.data.location !== undefined) updates.location = parsed.data.location;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    const [row] = await db
      .update(coachAppointmentsTable)
      .set(updates)
      .where(eq(coachAppointmentsTable.id, id))
      .returning();
    res.json({ ...row, startAt: row.startAt.toISOString(), createdAt: row.createdAt?.toISOString() ?? null, updatedAt: row.updatedAt?.toISOString() ?? null });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/appointments/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db
      .select({ id: coachAppointmentsTable.id })
      .from(coachAppointmentsTable)
      .where(and(eq(coachAppointmentsTable.id, id), eq(coachAppointmentsTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "RDV introuvable" } });
      return;
    }
    await db.delete(coachAppointmentsTable).where(eq(coachAppointmentsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
