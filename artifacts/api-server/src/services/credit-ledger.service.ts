import { db } from "@workspace/db";
import { creditBatchesTable, creditTransactionsTable, type CreditType } from "@workspace/db";
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { allocateFifo } from "../lib/ledger-math.js";
export type { Allocatable, Allocation } from "../lib/ledger-math.js";

export class InsufficientCreditsError extends Error {
  constructor(public readonly available: number, public readonly requested: number) {
    super(`Insufficient credits: requested ${requested}, available ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

function notExpired(now: Date) {
  return or(isNull(creditBatchesTable.expiresAt), gt(creditBatchesTable.expiresAt, now));
}

// The mutating functions below (creditBatch/consumeCredits/refundByBookingId)
// accept an optional executor so a caller that's already inside its own
// db.transaction() — e.g. booking.service.ts creating a booking AND debiting
// a credit — can pass its `tx` through and get one real atomic transaction,
// instead of these opening a second, separate one that could commit even if
// the outer operation later rolls back. Defaults to the top-level `db` for
// simple one-off callers (shop.ts, webhooks.ts) that don't need that.
// `Tx` is derived from db.transaction's own callback parameter rather than
// re-declared, so it can't drift from whatever drizzle-orm actually passes in.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export async function getBalance(athleteId: string, creditType: CreditType): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({ remaining: creditBatchesTable.creditsRemaining })
    .from(creditBatchesTable)
    .where(
      and(
        eq(creditBatchesTable.athleteId, athleteId),
        eq(creditBatchesTable.creditType, creditType),
        notExpired(now),
      ),
    );
  return rows.reduce((sum, r) => sum + r.remaining, 0);
}

export async function getBalances(athleteId: string): Promise<Record<CreditType, number>> {
  const [collectif, individuel] = await Promise.all([
    getBalance(athleteId, "collectif"),
    getBalance(athleteId, "individuel"),
  ]);
  return { collectif, individuel };
}

interface CreditBatchParams {
  athleteId: string;
  creditType: CreditType;
  credits: number;
  source: "purchase" | "gift";
  packId?: string;
  stripePaymentIntentId?: string;
  pricePaidCents?: number;
  validityMonths?: number | null;
  note?: string;
}

// Opens a new lot and records the crediting transaction. Validity is a per-lot
// timer starting now (per the client spec: "le compte à rebours démarre à l'achat").
export async function creditBatch(params: CreditBatchParams, executor: Executor = db) {
  const expiresAt = params.validityMonths
    ? new Date(Date.now() + params.validityMonths * 30 * 24 * 60 * 60 * 1000)
    : null;

  const run = async (tx: Executor) => {
    const [batch] = await tx
      .insert(creditBatchesTable)
      .values({
        athleteId: params.athleteId,
        creditType: params.creditType,
        creditsTotal: params.credits,
        creditsRemaining: params.credits,
        source: params.source,
        packId: params.packId,
        stripePaymentIntentId: params.stripePaymentIntentId,
        pricePaidCents: params.pricePaidCents,
        expiresAt,
        note: params.note,
      })
      .returning();

    await tx.insert(creditTransactionsTable).values({
      athleteId: params.athleteId,
      batchId: batch!.id,
      delta: params.credits,
      reason: params.source,
    });

    return batch!;
  };

  return executor === db ? db.transaction(run) : run(executor);
}

interface ConsumeParams {
  athleteId: string;
  creditType: CreditType;
  quantity: number;
  reason: "booking" | "waitlist_confirm" | "manual_adjustment";
  relatedBookingId?: string;
}

// FIFO by soonest-expiry across the athlete's open batches, row-locked so two
// concurrent bookings can't both spend the same last credit. Throws
// InsufficientCreditsError (and rolls the transaction back) if the balance is
// too low — callers should catch it and return a normal 4xx, not a 500.
// Pass `executor` (a `tx`) when this must commit-or-rollback together with
// other writes (e.g. the booking row itself) in the same transaction.
export async function consumeCredits(params: ConsumeParams, executor: Executor = db): Promise<void> {
  const run = async (tx: Executor) => {
    const now = new Date();
    const batches = await tx
      .select()
      .from(creditBatchesTable)
      .where(
        and(
          eq(creditBatchesTable.athleteId, params.athleteId),
          eq(creditBatchesTable.creditType, params.creditType),
          gt(creditBatchesTable.creditsRemaining, 0),
          notExpired(now),
        ),
      )
      .orderBy(sql`${creditBatchesTable.expiresAt} ASC NULLS LAST`, asc(creditBatchesTable.purchasedAt))
      .for("update");

    const { allocations, shortfall } = allocateFifo(batches, params.quantity);

    if (shortfall > 0) {
      const available = params.quantity - shortfall;
      throw new InsufficientCreditsError(available, params.quantity);
    }

    for (const { id, take } of allocations) {
      const batch = batches.find((b) => b.id === id)!;
      await tx
        .update(creditBatchesTable)
        .set({ creditsRemaining: batch.creditsRemaining - take })
        .where(eq(creditBatchesTable.id, id));
      await tx.insert(creditTransactionsTable).values({
        athleteId: params.athleteId,
        batchId: id,
        delta: -take,
        reason: params.reason,
        relatedBookingId: params.relatedBookingId,
      });
    }
  };

  await (executor === db ? db.transaction(run) : run(executor));
}

// Reverses exactly the debits recorded under `relatedBookingId`, crediting each
// affected batch back rather than opening a fresh one — preserves the original
// expiry provenance instead of silently extending it via a new unlimited batch.
export async function refundByBookingId(relatedBookingId: string, reason: "cancellation_refund" = "cancellation_refund", executor: Executor = db): Promise<void> {
  const run = async (tx: Executor) => {
    const debits = await tx
      .select()
      .from(creditTransactionsTable)
      .where(and(eq(creditTransactionsTable.relatedBookingId, relatedBookingId), sql`${creditTransactionsTable.delta} < 0`));

    for (const debit of debits) {
      const [batch] = await tx
        .select()
        .from(creditBatchesTable)
        .where(eq(creditBatchesTable.id, debit.batchId))
        .for("update");
      if (!batch) continue;
      const refundAmount = -debit.delta;
      await tx
        .update(creditBatchesTable)
        .set({ creditsRemaining: batch.creditsRemaining + refundAmount })
        .where(eq(creditBatchesTable.id, batch.id));
      await tx.insert(creditTransactionsTable).values({
        athleteId: debit.athleteId,
        batchId: batch.id,
        delta: refundAmount,
        reason,
        relatedBookingId,
      });
    }
  };

  await (executor === db ? db.transaction(run) : run(executor));
}
