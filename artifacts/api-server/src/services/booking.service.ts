import { db } from "@workspace/db";
import {
  classOccurrencesTable,
  classTemplatesTable,
  classBookingsTable,
  classWaitlistEntriesTable,
  studioSettingsTable,
  type ClassBooking,
  type ClassWaitlistEntry,
} from "@workspace/db";
import { and, asc, count, eq, lt } from "drizzle-orm";
import { consumeCredits, refundByBookingId } from "./credit-ledger.service.js";
import { notifyUser } from "./notify.service.js";
import { isLateCancellation } from "../lib/cancellation-math.js";

export class ClassNotFoundError extends Error {}
export class ClassFullError extends Error {}
export class AlreadyBookedError extends Error {}
export class AlreadyWaitlistedError extends Error {}
export class BookingNotFoundError extends Error {}
export class WaitlistOfferExpiredError extends Error {}

const WAITLIST_OFFER_WINDOW_MS = 30 * 60 * 1000;

export async function getCancellationWindowHours(templateId: string): Promise<number> {
  const [template] = await db
    .select({ cancellationWindowHours: classTemplatesTable.cancellationWindowHours, coachId: classTemplatesTable.coachId })
    .from(classTemplatesTable)
    .where(eq(classTemplatesTable.id, templateId));
  if (!template) return 24;
  if (template.cancellationWindowHours) return template.cancellationWindowHours;
  const [settings] = await db
    .select({ hours: studioSettingsTable.defaultCancellationWindowHours })
    .from(studioSettingsTable)
    .where(eq(studioSettingsTable.coachId, template.coachId));
  return settings?.hours ?? 24;
}

// Books with 1 (or the template's creditCost) collective credit(s). Everything
// happens inside one transaction — the occurrence row is locked first so two
// concurrent requests for the last spot can't both succeed, and the credit
// debit is passed the same `tx` so a failed debit rolls the booking back too.
export async function bookClassWithCredit(occurrenceId: string, athleteId: string): Promise<ClassBooking> {
  return db.transaction(async (tx) => {
    const [occurrence] = await tx.select().from(classOccurrencesTable).where(eq(classOccurrencesTable.id, occurrenceId)).for("update");
    if (!occurrence || occurrence.status !== "scheduled") throw new ClassNotFoundError();

    const [existing] = await tx
      .select({ id: classBookingsTable.id })
      .from(classBookingsTable)
      .where(and(eq(classBookingsTable.occurrenceId, occurrenceId), eq(classBookingsTable.athleteId, athleteId), eq(classBookingsTable.status, "confirmed")));
    if (existing) throw new AlreadyBookedError();

    const [{ value: confirmedCount }] = await tx
      .select({ value: count() })
      .from(classBookingsTable)
      .where(and(eq(classBookingsTable.occurrenceId, occurrenceId), eq(classBookingsTable.status, "confirmed")));
    if (confirmedCount >= occurrence.capacity) throw new ClassFullError();

    const [template] = await tx.select({ creditCost: classTemplatesTable.creditCost }).from(classTemplatesTable).where(eq(classTemplatesTable.id, occurrence.templateId));
    const creditCost = template?.creditCost ?? 1;

    const [booking] = await tx
      .insert(classBookingsTable)
      .values({ occurrenceId, athleteId, status: "confirmed", paymentMode: "credit", paymentStatus: "paid" })
      .returning();

    await consumeCredits({ athleteId, creditType: "collectif", quantity: creditCost, reason: "booking", relatedBookingId: booking!.id }, tx);

    return booking!;
  });
}

// Cancels a booking, applying the coach's (or studio default) cancellation
// window: inside the window, the credit stays spent (per spec, a coach can
// manually waive this later — see Phase 5); outside it, auto-refunded.
export async function cancelBooking(bookingId: string, athleteId: string): Promise<{ refunded: boolean; lateCancellation: boolean; occurrenceId: string }> {
  const result = await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(classBookingsTable)
      .where(and(eq(classBookingsTable.id, bookingId), eq(classBookingsTable.athleteId, athleteId)))
      .for("update");
    if (!booking || booking.status !== "confirmed") throw new BookingNotFoundError();

    const [occurrence] = await tx.select().from(classOccurrencesTable).where(eq(classOccurrencesTable.id, booking.occurrenceId));
    if (!occurrence) throw new BookingNotFoundError();

    const windowHours = await getCancellationWindowHours(occurrence.templateId);
    const isLate = isLateCancellation(occurrence.startAt, new Date(), windowHours);

    await tx
      .update(classBookingsTable)
      .set({ status: "cancelled", cancelledAt: new Date(), lateCancellation: isLate })
      .where(eq(classBookingsTable.id, bookingId));

    let refunded = false;
    if (!isLate && booking.paymentMode === "credit") {
      await refundByBookingId(bookingId, "cancellation_refund", tx);
      refunded = true;
    }

    return { refunded, lateCancellation: isLate, occurrenceId: occurrence.id };
  });

  // Best-effort, outside the transaction: a spot just freed up.
  await promoteNextWaitlistEntry(result.occurrenceId).catch(() => {});
  return result;
}

export async function joinWaitlist(occurrenceId: string, athleteId: string): Promise<ClassWaitlistEntry> {
  return db.transaction(async (tx) => {
    const [occurrence] = await tx.select().from(classOccurrencesTable).where(eq(classOccurrencesTable.id, occurrenceId));
    if (!occurrence || occurrence.status !== "scheduled") throw new ClassNotFoundError();

    const [existingBooking] = await tx
      .select({ id: classBookingsTable.id })
      .from(classBookingsTable)
      .where(and(eq(classBookingsTable.occurrenceId, occurrenceId), eq(classBookingsTable.athleteId, athleteId), eq(classBookingsTable.status, "confirmed")));
    if (existingBooking) throw new AlreadyBookedError();

    const [existingEntry] = await tx
      .select({ id: classWaitlistEntriesTable.id })
      .from(classWaitlistEntriesTable)
      .where(
        and(
          eq(classWaitlistEntriesTable.occurrenceId, occurrenceId),
          eq(classWaitlistEntriesTable.athleteId, athleteId),
        ),
      );
    if (existingEntry) {
      const [row] = await tx
        .select()
        .from(classWaitlistEntriesTable)
        .where(eq(classWaitlistEntriesTable.id, existingEntry.id));
      if (row && (row.status === "waiting" || row.status === "offered")) throw new AlreadyWaitlistedError();
      // A withdrawn/expired entry can be reused for a fresh join.
      const [updated] = await tx
        .update(classWaitlistEntriesTable)
        .set({ status: "waiting", offeredAt: null, offerExpiresAt: null })
        .where(eq(classWaitlistEntriesTable.id, existingEntry.id))
        .returning();
      return updated!;
    }

    const [entry] = await tx.insert(classWaitlistEntriesTable).values({ occurrenceId, athleteId, status: "waiting" }).returning();
    return entry!;
  });
}

export async function leaveWaitlist(occurrenceId: string, athleteId: string): Promise<void> {
  await db
    .update(classWaitlistEntriesTable)
    .set({ status: "withdrawn" })
    .where(
      and(
        eq(classWaitlistEntriesTable.occurrenceId, occurrenceId),
        eq(classWaitlistEntriesTable.athleteId, athleteId),
      ),
    );
}

// Offers the next "waiting" entry a 30-minute window to confirm, but only if
// a spot is genuinely free and nobody else already has an active offer.
// Called both right after a cancellation and by the periodic sweep in
// waitlist-job.ts (which also expires stale offers first).
export async function promoteNextWaitlistEntry(occurrenceId: string): Promise<void> {
  const promotedAthleteId = await db.transaction(async (tx) => {
    const [occurrence] = await tx.select().from(classOccurrencesTable).where(eq(classOccurrencesTable.id, occurrenceId)).for("update");
    if (!occurrence || occurrence.status !== "scheduled") return null;

    const [{ value: confirmedCount }] = await tx
      .select({ value: count() })
      .from(classBookingsTable)
      .where(and(eq(classBookingsTable.occurrenceId, occurrenceId), eq(classBookingsTable.status, "confirmed")));
    if (confirmedCount >= occurrence.capacity) return null;

    const [activeOffer] = await tx
      .select({ id: classWaitlistEntriesTable.id })
      .from(classWaitlistEntriesTable)
      .where(and(eq(classWaitlistEntriesTable.occurrenceId, occurrenceId), eq(classWaitlistEntriesTable.status, "offered")));
    if (activeOffer) return null;

    const [next] = await tx
      .select()
      .from(classWaitlistEntriesTable)
      .where(and(eq(classWaitlistEntriesTable.occurrenceId, occurrenceId), eq(classWaitlistEntriesTable.status, "waiting")))
      .orderBy(asc(classWaitlistEntriesTable.createdAt))
      .limit(1)
      .for("update");
    if (!next) return null;

    const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_WINDOW_MS);
    await tx
      .update(classWaitlistEntriesTable)
      .set({ status: "offered", offeredAt: new Date(), offerExpiresAt })
      .where(eq(classWaitlistEntriesTable.id, next.id));

    return next.athleteId;
  });

  if (promotedAthleteId) {
    notifyUser({
      userId: promotedAthleteId,
      type: "waitlist_spot_freed",
      title: "Une place s'est libérée 🎉",
      body: "Tu as 30 minutes pour confirmer ta place avant qu'elle ne passe au suivant.",
    }).catch(() => {});
  }
}

// Sweeps every "offered" entry whose 30-minute window has lapsed, marks it
// expired, and tries to promote the next person in line for that class.
// Called by waitlist-job.ts on a short interval — see index.ts.
export async function expireStaleWaitlistOffers(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select({ id: classWaitlistEntriesTable.id, occurrenceId: classWaitlistEntriesTable.occurrenceId })
    .from(classWaitlistEntriesTable)
    .where(and(eq(classWaitlistEntriesTable.status, "offered"), lt(classWaitlistEntriesTable.offerExpiresAt, now)));

  for (const entry of expired) {
    await db.update(classWaitlistEntriesTable).set({ status: "expired" }).where(eq(classWaitlistEntriesTable.id, entry.id));
    await promoteNextWaitlistEntry(entry.occurrenceId).catch(() => {});
  }
  return expired.length;
}

// Confirms an offered waitlist spot: credit debited only now, never at
// request/offer time (per spec).
export async function confirmWaitlistOffer(occurrenceId: string, athleteId: string): Promise<ClassBooking> {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(classWaitlistEntriesTable)
      .where(
        and(
          eq(classWaitlistEntriesTable.occurrenceId, occurrenceId),
          eq(classWaitlistEntriesTable.athleteId, athleteId),
          eq(classWaitlistEntriesTable.status, "offered"),
        ),
      )
      .for("update");
    if (!entry || !entry.offerExpiresAt || entry.offerExpiresAt.getTime() < Date.now()) throw new WaitlistOfferExpiredError();

    const [occurrence] = await tx.select().from(classOccurrencesTable).where(eq(classOccurrencesTable.id, occurrenceId));
    if (!occurrence) throw new ClassNotFoundError();
    const [template] = await tx.select({ creditCost: classTemplatesTable.creditCost }).from(classTemplatesTable).where(eq(classTemplatesTable.id, occurrence.templateId));
    const creditCost = template?.creditCost ?? 1;

    const [booking] = await tx
      .insert(classBookingsTable)
      .values({ occurrenceId, athleteId, status: "confirmed", paymentMode: "credit", paymentStatus: "paid" })
      .returning();

    await consumeCredits({ athleteId, creditType: "collectif", quantity: creditCost, reason: "waitlist_confirm", relatedBookingId: booking!.id }, tx);
    await tx.update(classWaitlistEntriesTable).set({ status: "confirmed" }).where(eq(classWaitlistEntriesTable.id, entry.id));

    return booking!;
  });
}
