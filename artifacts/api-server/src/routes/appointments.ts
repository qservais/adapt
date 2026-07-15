import { Router } from "express";
import { db } from "@workspace/db";
import { coachAppointmentsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, lt, ne } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { consumeCredits, InsufficientCreditsError } from "../services/credit-ledger.service.js";
import { notifyUser } from "../services/notify.service.js";
import { sendOneOnOneConfirmedEmail } from "../services/email.js";
import { cancelOneOnOne, RequestNotFoundError, formatWhenFr } from "../services/one-on-one.service.js";

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
          status: coachAppointmentsTable.status,
          requestedBy: coachAppointmentsTable.requestedBy,
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
            lt(coachAppointmentsTable.startAt, monthEnd),
            ne(coachAppointmentsTable.status, "declined"),
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
          status: coachAppointmentsTable.status,
          requestedBy: coachAppointmentsTable.requestedBy,
          createdAt: coachAppointmentsTable.createdAt,
          athleteFirstName: usersTable.firstName,
          athleteLastName: usersTable.lastName,
        })
        .from(coachAppointmentsTable)
        .leftJoin(usersTable, eq(coachAppointmentsTable.athleteId, usersTable.id))
        .where(and(eq(coachAppointmentsTable.coachId, coachId), ne(coachAppointmentsTable.status, "declined")));
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

// Direct coach booking (Fiche athlète 360° → "Planifier un 1:1"). Debits 1
// individuel credit immediately — a coach-initiated session is a real
// session too, not a way to bypass the credit system — and sends push+email
// (the athlete-requested flow confirmed via /confirm below is push-only,
// per spec: the two flows have different notification requirements).
router.post("/coach/appointments", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const [athlete] = await db
      .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, language: usersTable.language })
      .from(usersTable)
      .where(and(eq(usersTable.id, parsed.data.athleteId), eq(usersTable.coachId, coachId)));
    if (!athlete) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Athlète introuvable ou non associé" } });
      return;
    }

    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(coachAppointmentsTable)
        .values({
          coachId,
          athleteId: parsed.data.athleteId,
          startAt: new Date(parsed.data.startAt),
          durationMin: parsed.data.durationMin,
          location: parsed.data.location,
          notes: parsed.data.notes,
          status: "confirmed",
          requestedBy: "coach",
        })
        .returning();
      await consumeCredits({ athleteId: parsed.data.athleteId, creditType: "individuel", quantity: 1, reason: "booking", relatedBookingId: inserted!.id }, tx);
      return inserted!;
    });

    notifyUser({
      userId: athlete.id,
      type: "one_on_one_confirmed",
      title: "1:1 confirmé ✓",
      body: `Rendez-vous confirmé le ${formatWhenFr(row.startAt)}.`,
    }).catch(() => {});
    sendOneOnOneConfirmedEmail(athlete.email, athlete.firstName, formatWhenFr(row.startAt), athlete.language === "en" ? "en" : "fr").catch(() => {});

    res.status(201).json({ ...row, startAt: row.startAt.toISOString(), createdAt: row.createdAt?.toISOString() ?? null });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      res.status(402).json({ error: { code: "INSUFFICIENT_CREDITS", message: "Cet athlète n'a plus de crédit 1:1" } });
      return;
    }
    console.error(err);
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

// Soft-cancels (not a hard delete — a confirmed appointment may have a credit
// tied to it, which this refunds automatically; see one-on-one.service.ts).
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
    const result = await cancelOneOnOne(id, coachId);
    res.json({ success: true, refunded: result.refunded });
  } catch (err) {
    if (err instanceof RequestNotFoundError) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "RDV introuvable" } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
