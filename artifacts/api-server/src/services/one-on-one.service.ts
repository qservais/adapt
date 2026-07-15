import { db } from "@workspace/db";
import { coachAppointmentsTable, usersTable, type CoachAppointment } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { consumeCredits, refundByBookingId } from "./credit-ledger.service.js";
import { notifyUser } from "./notify.service.js";
import { sendOneOnOneConfirmedEmail } from "./email.js";

export class SlotUnavailableError extends Error {}
export class RequestNotFoundError extends Error {}
export class AlreadyDecidedError extends Error {}

// Per spec: "Durée des séances 1:1 : 1 heure" — fixed, not coach-configurable.
export const ONE_ON_ONE_DURATION_MIN = 60;

export function formatWhenFr(startAt: Date): string {
  return startAt.toLocaleString("fr-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}

// Member picks one of the coach's open recurring slots for a specific future
// date. No credit is debited here — only at confirm time (see below).
export async function requestOneOnOne(athleteId: string, coachId: string, startAt: Date): Promise<CoachAppointment> {
  return db.transaction(async (tx) => {
    const [conflict] = await tx
      .select({ id: coachAppointmentsTable.id })
      .from(coachAppointmentsTable)
      .where(
        and(
          eq(coachAppointmentsTable.coachId, coachId),
          eq(coachAppointmentsTable.startAt, startAt),
          ne(coachAppointmentsTable.status, "declined"),
          ne(coachAppointmentsTable.status, "cancelled"),
        ),
      );
    if (conflict) throw new SlotUnavailableError();

    const [appt] = await tx
      .insert(coachAppointmentsTable)
      .values({ coachId, athleteId, startAt, durationMin: ONE_ON_ONE_DURATION_MIN, status: "pending", requestedBy: "athlete" })
      .returning();

    return appt!;
  }).then(async (appt) => {
    notifyUser({
      userId: coachId,
      type: "one_on_one_request",
      title: "Nouvelle demande de 1:1",
      body: `Un athlète demande un créneau le ${formatWhenFr(appt.startAt)}.`,
    }).catch(() => {});
    return appt;
  });
}

// Confirming (whether the athlete requested it, or the coach is booking one
// directly from the athlete's 360 profile) debits 1 individuel credit — a
// coach-direct booking is a real session too, not a way to bypass credits.
// Notification channel differs by origin per spec: athlete-requested → push
// only; coach-direct → push + email.
export async function confirmOneOnOne(appointmentId: string, coachId: string): Promise<CoachAppointment> {
  const appt = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(coachAppointmentsTable)
      .where(and(eq(coachAppointmentsTable.id, appointmentId), eq(coachAppointmentsTable.coachId, coachId)))
      .for("update");
    if (!existing) throw new RequestNotFoundError();
    if (existing.status !== "pending") throw new AlreadyDecidedError();

    await consumeCredits({ athleteId: existing.athleteId, creditType: "individuel", quantity: 1, reason: "booking", relatedBookingId: existing.id }, tx);

    const [updated] = await tx
      .update(coachAppointmentsTable)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(coachAppointmentsTable.id, appointmentId))
      .returning();
    return updated!;
  });

  const [athlete] = await db.select({ email: usersTable.email, firstName: usersTable.firstName, language: usersTable.language }).from(usersTable).where(eq(usersTable.id, appt.athleteId));

  notifyUser({
    userId: appt.athleteId,
    type: "one_on_one_confirmed",
    title: "1:1 confirmé ✓",
    body: `Rendez-vous confirmé le ${formatWhenFr(appt.startAt)}.`,
  }).catch(() => {});

  if (appt.requestedBy === "coach" && athlete) {
    sendOneOnOneConfirmedEmail(athlete.email, athlete.firstName, formatWhenFr(appt.startAt), athlete.language === "en" ? "en" : "fr").catch(() => {});
  }

  return appt;
}

export async function declineOneOnOne(appointmentId: string, coachId: string): Promise<CoachAppointment> {
  const [existing] = await db
    .select()
    .from(coachAppointmentsTable)
    .where(and(eq(coachAppointmentsTable.id, appointmentId), eq(coachAppointmentsTable.coachId, coachId)));
  if (!existing) throw new RequestNotFoundError();
  if (existing.status !== "pending") throw new AlreadyDecidedError();

  const [updated] = await db
    .update(coachAppointmentsTable)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(coachAppointmentsTable.id, appointmentId))
    .returning();

  notifyUser({
    userId: existing.athleteId,
    type: "one_on_one_confirmed",
    title: "1:1 non disponible",
    body: `Ton coach ne peut pas te recevoir le ${formatWhenFr(existing.startAt)} — demande un autre créneau.`,
  }).catch(() => {});

  return updated!;
}

// Cancels a confirmed or pending appointment. Refunds the individuel credit
// if one was actually debited (i.e. it was "confirmed") — refundByBookingId
// is a safe no-op for pending requests (nothing was ever consumed) and for
// legacy pre-credit-system rows (no matching debit transaction exists).
export async function cancelOneOnOne(appointmentId: string, actorId: string): Promise<{ refunded: boolean }> {
  const existing = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(coachAppointmentsTable)
      .where(and(eq(coachAppointmentsTable.id, appointmentId), and(ne(coachAppointmentsTable.status, "cancelled"), ne(coachAppointmentsTable.status, "declined"))))
      .for("update");
    if (!row || (row.athleteId !== actorId && row.coachId !== actorId)) throw new RequestNotFoundError();

    const wasConfirmed = row.status === "confirmed";
    await tx.update(coachAppointmentsTable).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(coachAppointmentsTable.id, appointmentId));
    if (wasConfirmed) {
      await refundByBookingId(appointmentId, "cancellation_refund", tx);
    }
    return { ...row, wasConfirmed };
  });

  const notifyTarget = existing.athleteId === actorId ? existing.coachId : existing.athleteId;
  notifyUser({
    userId: notifyTarget,
    type: "class_cancelled",
    title: "1:1 annulé",
    body: `Le rendez-vous du ${formatWhenFr(existing.startAt)} a été annulé.`,
  }).catch(() => {});

  return { refunded: existing.wasConfirmed };
}
