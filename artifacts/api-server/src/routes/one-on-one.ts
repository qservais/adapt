import { Router } from "express";
import { db } from "@workspace/db";
import { coachAvailabilitySlotsTable, coachAppointmentsTable, studioSettingsTable } from "@workspace/db";
import { and, asc, eq, ne } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import {
  requestOneOnOne,
  confirmOneOnOne,
  declineOneOnOne,
  SlotUnavailableError,
  RequestNotFoundError,
  AlreadyDecidedError,
} from "../services/one-on-one.service.js";
import { InsufficientCreditsError } from "../services/credit-ledger.service.js";

const router = Router();

function requestErrorResponse(err: unknown): { status: number; code: string; message: string } | null {
  if (err instanceof SlotUnavailableError) return { status: 409, code: "SLOT_UNAVAILABLE", message: "Ce créneau vient d'être pris" };
  if (err instanceof RequestNotFoundError) return { status: 404, code: "NOT_FOUND", message: "Demande introuvable" };
  if (err instanceof AlreadyDecidedError) return { status: 409, code: "ALREADY_DECIDED", message: "Cette demande a déjà été traitée" };
  if (err instanceof InsufficientCreditsError) return { status: 402, code: "INSUFFICIENT_CREDITS", message: "Crédits 1:1 insuffisants" };
  return null;
}

// ─── Coach: availability template ───────────────────────────────────────────

router.get("/coach/availability", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const slots = await db
      .select()
      .from(coachAvailabilitySlotsTable)
      .where(and(eq(coachAvailabilitySlotsTable.coachId, req.user!.userId), eq(coachAvailabilitySlotsTable.isActive, true)))
      .orderBy(asc(coachAvailabilitySlotsTable.dayOfWeek), asc(coachAvailabilitySlotsTable.startTime));
    res.json(slots);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const addSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

router.post("/coach/availability", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = addSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const [existing] = await db
      .select({ id: coachAvailabilitySlotsTable.id })
      .from(coachAvailabilitySlotsTable)
      .where(
        and(
          eq(coachAvailabilitySlotsTable.coachId, coachId),
          eq(coachAvailabilitySlotsTable.dayOfWeek, parsed.data.dayOfWeek),
          eq(coachAvailabilitySlotsTable.startTime, parsed.data.startTime),
          eq(coachAvailabilitySlotsTable.isActive, true),
        ),
      );
    if (existing) {
      res.status(409).json({ error: { code: "ALREADY_EXISTS", message: "Ce créneau est déjà ouvert" } });
      return;
    }
    const [slot] = await db.insert(coachAvailabilitySlotsTable).values({ coachId, ...parsed.data }).returning();
    res.status(201).json(slot);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/availability/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: coachAvailabilitySlotsTable.id }).from(coachAvailabilitySlotsTable).where(and(eq(coachAvailabilitySlotsTable.id, id), eq(coachAvailabilitySlotsTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Créneau introuvable" } });
      return;
    }
    await db.update(coachAvailabilitySlotsTable).set({ isActive: false }).where(eq(coachAvailabilitySlotsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Athlete: view slots + request ──────────────────────────────────────────

router.get("/athlete/coach-slots", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const dateStr = String(req.query["date"] ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Paramètre 'date' requis (YYYY-MM-DD)" } });
      return;
    }
    const date = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = date.getUTCDay();

    const [studio] = await db.select({ coachId: studioSettingsTable.coachId }).from(studioSettingsTable).orderBy(asc(studioSettingsTable.createdAt)).limit(1);
    if (!studio) {
      res.json([]);
      return;
    }

    const slots = await db
      .select()
      .from(coachAvailabilitySlotsTable)
      .where(and(eq(coachAvailabilitySlotsTable.coachId, studio.coachId), eq(coachAvailabilitySlotsTable.dayOfWeek, dayOfWeek), eq(coachAvailabilitySlotsTable.isActive, true)))
      .orderBy(asc(coachAvailabilitySlotsTable.startTime));

    const taken = await db
      .select({ startAt: coachAppointmentsTable.startAt })
      .from(coachAppointmentsTable)
      .where(and(eq(coachAppointmentsTable.coachId, studio.coachId), ne(coachAppointmentsTable.status, "declined"), ne(coachAppointmentsTable.status, "cancelled")));
    const takenTimes = new Set(
      taken
        .filter((t) => t.startAt.toISOString().slice(0, 10) === dateStr)
        .map((t) => t.startAt.toISOString().slice(11, 16)),
    );

    res.json(slots.filter((s) => !takenTimes.has(s.startTime)));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

router.post("/athlete/1on1-requests", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [studio] = await db.select({ coachId: studioSettingsTable.coachId }).from(studioSettingsTable).orderBy(asc(studioSettingsTable.createdAt)).limit(1);
    if (!studio) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Aucun coach configuré" } });
      return;
    }
    const startAt = new Date(`${parsed.data.date}T${parsed.data.time}:00Z`);
    const appt = await requestOneOnOne(req.user!.userId, studio.coachId, startAt);
    res.status(201).json(appt);
  } catch (err) {
    const mapped = requestErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: confirm / decline a request ─────────────────────────────────────

router.post("/coach/appointments/:id/confirm", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const appt = await confirmOneOnOne(String(req.params["id"]), req.user!.userId);
    res.json(appt);
  } catch (err) {
    const mapped = requestErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/appointments/:id/decline", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const appt = await declineOneOnOne(String(req.params["id"]), req.user!.userId);
    res.json(appt);
  } catch (err) {
    const mapped = requestErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
