import { Router } from "express";
import { db } from "@workspace/db";
import {
  classTemplatesTable,
  classRecurrenceRulesTable,
  classOccurrencesTable,
  classBookingsTable,
  classWaitlistEntriesTable,
  usersTable,
} from "@workspace/db";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import {
  bookClassWithCredit,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
  confirmWaitlistOffer,
  manualRegisterForClass,
  waiveLateCancellation,
  getOccurrenceParticipants,
  cancelClassOccurrence,
  ClassNotFoundError,
  ClassFullError,
  AlreadyBookedError,
  AlreadyWaitlistedError,
  BookingNotFoundError,
  WaitlistOfferExpiredError,
  NothingToWaiveError,
} from "../services/booking.service.js";
import { notifyUser } from "../services/notify.service.js";
import { InsufficientCreditsError } from "../services/credit-ledger.service.js";
import { issueInvoice } from "../services/invoicing.service.js";
import { logger } from "../lib/logger.js";

const router = Router();

function bookingErrorResponse(err: unknown): { status: number; code: string; message: string } | null {
  if (err instanceof ClassNotFoundError) return { status: 404, code: "NOT_FOUND", message: "Cours introuvable" };
  if (err instanceof ClassFullError) return { status: 409, code: "CLASS_FULL", message: "Trop tard, la place vient d'être prise" };
  if (err instanceof AlreadyBookedError) return { status: 409, code: "ALREADY_BOOKED", message: "Tu es déjà inscrit·e à ce cours" };
  if (err instanceof AlreadyWaitlistedError) return { status: 409, code: "ALREADY_WAITLISTED", message: "Tu es déjà sur la liste d'attente" };
  if (err instanceof BookingNotFoundError) return { status: 404, code: "NOT_FOUND", message: "Réservation introuvable" };
  if (err instanceof WaitlistOfferExpiredError) return { status: 410, code: "OFFER_EXPIRED", message: "Ta fenêtre de confirmation est expirée" };
  if (err instanceof InsufficientCreditsError) return { status: 402, code: "INSUFFICIENT_CREDITS", message: "Crédits insuffisants" };
  if (err instanceof NothingToWaiveError) return { status: 409, code: "NOTHING_TO_WAIVE", message: "Rien à offrir sur cette réservation" };
  return null;
}

// ─── Member-facing ───────────────────────────────────────────────────────────

router.get("/classes/occurrences", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const athleteId = req.user!.userId;
    const from = req.query["from"] ? new Date(String(req.query["from"])) : new Date();
    const to = req.query["to"] ? new Date(String(req.query["to"])) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

    const occurrences = await db
      .select({
        id: classOccurrencesTable.id,
        startAt: classOccurrencesTable.startAt,
        durationMin: classOccurrencesTable.durationMin,
        capacity: classOccurrencesTable.capacity,
        status: classOccurrencesTable.status,
        templateId: classOccurrencesTable.templateId,
        name: classTemplatesTable.name,
        description: classTemplatesTable.description,
        priceCents: classTemplatesTable.priceCents,
        creditCost: classTemplatesTable.creditCost,
        coachFirstName: usersTable.firstName,
      })
      .from(classOccurrencesTable)
      .innerJoin(classTemplatesTable, eq(classOccurrencesTable.templateId, classTemplatesTable.id))
      .innerJoin(usersTable, eq(classOccurrencesTable.coachId, usersTable.id))
      .where(and(eq(classOccurrencesTable.status, "scheduled"), gte(classOccurrencesTable.startAt, from), lte(classOccurrencesTable.startAt, to)))
      .orderBy(asc(classOccurrencesTable.startAt));

    const enriched = await Promise.all(
      occurrences.map(async (o) => {
        const [{ value: booked }] = await db
          .select({ value: count() })
          .from(classBookingsTable)
          .where(and(eq(classBookingsTable.occurrenceId, o.id), eq(classBookingsTable.status, "confirmed")));
        const [myBooking] = await db
          .select({ id: classBookingsTable.id })
          .from(classBookingsTable)
          .where(and(eq(classBookingsTable.occurrenceId, o.id), eq(classBookingsTable.athleteId, athleteId), eq(classBookingsTable.status, "confirmed")));
        const [myWaitlist] = await db
          .select({ status: classWaitlistEntriesTable.status })
          .from(classWaitlistEntriesTable)
          .where(and(eq(classWaitlistEntriesTable.occurrenceId, o.id), eq(classWaitlistEntriesTable.athleteId, athleteId)));
        return {
          ...o,
          spotsBooked: booked,
          spotsAvailable: Math.max(0, o.capacity - booked),
          isBooked: !!myBooking,
          bookingId: myBooking?.id ?? null,
          waitlistStatus: myWaitlist && myWaitlist.status !== "withdrawn" ? myWaitlist.status : null,
        };
      }),
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/classes/:occurrenceId/book", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const booking = await bookClassWithCredit(String(req.params["occurrenceId"]), req.user!.userId);
    notifyUser({
      userId: req.user!.userId,
      type: "booking_confirmed",
      title: "Réservation confirmée ✓",
      body: "Ta place est réservée.",
    }).catch(() => {});
    res.status(201).json(booking);
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/classes/bookings/:bookingId/cancel", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const result = await cancelBooking(String(req.params["bookingId"]), req.user!.userId);
    res.json({
      success: true,
      refunded: result.refunded,
      lateCancellation: result.lateCancellation,
      message: result.refunded
        ? "Réservation annulée — crédit restauré"
        : "Réservation annulée — hors délai, le crédit reste décompté",
    });
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/classes/:occurrenceId/waitlist", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const entry = await joinWaitlist(String(req.params["occurrenceId"]), req.user!.userId);
    res.status(201).json(entry);
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/classes/:occurrenceId/waitlist", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    await leaveWaitlist(String(req.params["occurrenceId"]), req.user!.userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/classes/:occurrenceId/waitlist/confirm", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const booking = await confirmWaitlistOffer(String(req.params["occurrenceId"]), req.user!.userId);
    res.status(201).json(booking);
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: class template CRUD ─────────────────────────────────────────────

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1).max(200),
  priceCents: z.number().int().min(0),
  creditCost: z.number().int().min(1).max(10).default(1),
  durationMin: z.number().int().min(5).max(480),
  cancellationWindowHours: z.number().int().min(1).max(168).nullable().optional(),
});

router.get("/coach/classes/templates", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const templates = await db.select().from(classTemplatesTable).where(eq(classTemplatesTable.coachId, req.user!.userId)).orderBy(asc(classTemplatesTable.createdAt));
    res.json(templates);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/classes/templates", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [template] = await db.insert(classTemplatesTable).values({ coachId: req.user!.userId, ...parsed.data }).returning();
    res.status(201).json(template);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/classes/templates/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: classTemplatesTable.id }).from(classTemplatesTable).where(and(eq(classTemplatesTable.id, id), eq(classTemplatesTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Cours introuvable" } });
      return;
    }
    const [template] = await db.update(classTemplatesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(classTemplatesTable.id, id)).returning();
    res.json(template);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/classes/templates/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: classTemplatesTable.id }).from(classTemplatesTable).where(and(eq(classTemplatesTable.id, id), eq(classTemplatesTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Cours introuvable" } });
      return;
    }
    await db.update(classTemplatesTable).set({ isActive: false, updatedAt: new Date() }).where(eq(classTemplatesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: scheduling ───────────────────────────────────────────────────────

const scheduleOnceSchema = z.object({
  mode: z.literal("once"),
  startAt: z.string().datetime({ offset: true }),
});

const scheduleWeeklySchema = z.object({
  mode: z.literal("weekly"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weeksAhead: z.number().int().min(1).max(26).default(8),
});

const scheduleSchema = z.discriminatedUnion("mode", [scheduleOnceSchema, scheduleWeeklySchema]);

router.post("/coach/classes/templates/:id/schedule", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [template] = await db.select().from(classTemplatesTable).where(and(eq(classTemplatesTable.id, id), eq(classTemplatesTable.coachId, coachId)));
    if (!template) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Cours introuvable" } });
      return;
    }

    if (parsed.data.mode === "once") {
      const [occurrence] = await db
        .insert(classOccurrencesTable)
        .values({
          templateId: template.id,
          coachId,
          startAt: new Date(parsed.data.startAt),
          durationMin: template.durationMin,
          capacity: template.capacity,
        })
        .returning();
      res.status(201).json({ occurrences: [occurrence] });
      return;
    }

    // Weekly recurring: create the rule, then materialize concrete occurrences
    // for the next N weeks (occurrences are what's actually booked against —
    // the rule is just the generator, not itself bookable).
    const { dayOfWeek, startTime, weeksAhead } = parsed.data;
    const [rule] = await db
      .insert(classRecurrenceRulesTable)
      .values({ templateId: template.id, dayOfWeek, startTime })
      .returning();

    const [hourStr, minuteStr] = startTime.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    const occurrencesToInsert: (typeof classOccurrencesTable.$inferInsert)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let week = 0; week < weeksAhead; week++) {
      const candidate = new Date(today);
      candidate.setDate(candidate.getDate() + week * 7 + ((dayOfWeek - candidate.getDay() + 7) % 7));
      candidate.setHours(hour, minute, 0, 0);
      if (candidate.getTime() < Date.now()) continue;
      occurrencesToInsert.push({
        templateId: template.id,
        coachId,
        recurrenceRuleId: rule!.id,
        startAt: candidate,
        durationMin: template.durationMin,
        capacity: template.capacity,
      });
    }

    const occurrences = occurrencesToInsert.length ? await db.insert(classOccurrencesTable).values(occurrencesToInsert).returning() : [];
    res.status(201).json({ rule, occurrences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: operational tools (Phase 5) ─────────────────────────────────────

const manualRegisterSchema = z
  .object({
    athleteId: z.string().uuid().optional(),
    guestName: z.string().min(1).max(150).optional(),
    paymentMode: z.enum(["comped", "credit", "pay_on_site"]),
  })
  .refine((data) => !!data.athleteId || !!data.guestName, { message: "athleteId ou guestName requis" });

router.post("/coach/classes/occurrences/:occurrenceId/register", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = manualRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const occurrenceId = String(req.params["occurrenceId"]);
    const coachId = req.user!.userId;
    const booking = await manualRegisterForClass(occurrenceId, coachId, parsed.data);

    // "Sur place" is the one manual-registration mode where real money
    // changes hands right then — invoice it. "Offert" has no accounting
    // entry (per spec) and "crédit" was already invoiced when the credit
    // pack itself was purchased. Guest/trial registrations (no athleteId)
    // aren't invoiced — there's no account to attach the note to.
    if (parsed.data.paymentMode === "pay_on_site" && parsed.data.athleteId) {
      const [occurrence] = await db.select({ templateId: classOccurrencesTable.templateId }).from(classOccurrencesTable).where(eq(classOccurrencesTable.id, occurrenceId));
      const [template] = occurrence ? await db.select({ name: classTemplatesTable.name, priceCents: classTemplatesTable.priceCents }).from(classTemplatesTable).where(eq(classTemplatesTable.id, occurrence.templateId)) : [];
      if (template) {
        issueInvoice({
          coachId,
          athleteId: parsed.data.athleteId,
          description: template.name,
          amountCentsTtc: template.priceCents,
          paymentMethod: "cash",
          sourceType: "class_booking",
          sourceId: booking.id,
        }).catch((err) => logger.error({ err, occurrenceId, athleteId: parsed.data.athleteId }, "issueInvoice (pay_on_site class registration) failed"));
      }
    }

    res.status(201).json(booking);
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/classes/bookings/:bookingId/waive-late-cancellation", authenticate, requireRole("coach"), async (req, res) => {
  try {
    await waiveLateCancellation(String(req.params["bookingId"]), req.user!.userId);
    res.json({ success: true, message: "Annulation offerte — non décomptée" });
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/classes/occurrences/:occurrenceId/participants", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const participants = await getOccurrenceParticipants(String(req.params["occurrenceId"]));
    res.json(participants);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const cancelOccurrenceSchema = z.object({
  note: z.string().max(500).optional(),
});

router.post("/coach/classes/occurrences/:occurrenceId/cancel", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = cancelOccurrenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const result = await cancelClassOccurrence(String(req.params["occurrenceId"]), req.user!.userId, parsed.data.note);
    res.json({ success: true, notifiedCount: result.notifiedCount });
  } catch (err) {
    const mapped = bookingErrorResponse(err);
    if (mapped) {
      res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// Coach-facing occurrence list with fill counts (vs. the member-facing
// /classes/occurrences, which also carries the caller's own booking/waitlist
// status) — used for the fill-rate view and week/month agenda.
router.get("/coach/classes/occurrences", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const from = req.query["from"] ? new Date(String(req.query["from"])) : new Date();
    const to = req.query["to"] ? new Date(String(req.query["to"])) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    const occurrences = await db
      .select({
        id: classOccurrencesTable.id,
        startAt: classOccurrencesTable.startAt,
        durationMin: classOccurrencesTable.durationMin,
        capacity: classOccurrencesTable.capacity,
        status: classOccurrencesTable.status,
        templateId: classOccurrencesTable.templateId,
        name: classTemplatesTable.name,
      })
      .from(classOccurrencesTable)
      .innerJoin(classTemplatesTable, eq(classOccurrencesTable.templateId, classTemplatesTable.id))
      .where(and(eq(classOccurrencesTable.coachId, coachId), gte(classOccurrencesTable.startAt, from), lte(classOccurrencesTable.startAt, to)))
      .orderBy(asc(classOccurrencesTable.startAt));

    const enriched = await Promise.all(
      occurrences.map(async (o) => {
        const [{ value: booked }] = await db
          .select({ value: count() })
          .from(classBookingsTable)
          .where(and(eq(classBookingsTable.occurrenceId, o.id), eq(classBookingsTable.status, "confirmed")));
        const [{ value: waitlisted }] = await db
          .select({ value: count() })
          .from(classWaitlistEntriesTable)
          .where(and(eq(classWaitlistEntriesTable.occurrenceId, o.id), eq(classWaitlistEntriesTable.status, "waiting")));
        return { ...o, spotsBooked: booked, spotsAvailable: Math.max(0, o.capacity - booked), waitlistCount: waitlisted };
      }),
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
