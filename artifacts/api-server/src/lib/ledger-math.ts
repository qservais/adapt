// Pure functions for credit/promo math — deliberately has zero imports from
// @workspace/db or anything else that touches a live connection, so these can
// be unit-tested (tests/credit-ledger.test.ts) without Postgres or Stripe.

export interface Allocatable {
  id: string;
  creditsRemaining: number;
}

export interface Allocation {
  id: string;
  take: number;
}

// FIFO-by-soonest-expiry allocator: given batches already sorted
// soonest-expiry-first (the DB query does the sorting) and a quantity to
// consume, decide how much to take from each.
export function allocateFifo(batchesSortedByPriority: Allocatable[], quantity: number): { allocations: Allocation[]; shortfall: number } {
  const allocations: Allocation[] = [];
  let remaining = quantity;
  for (const batch of batchesSortedByPriority) {
    if (remaining <= 0) break;
    const take = Math.min(batch.creditsRemaining, remaining);
    if (take > 0) allocations.push({ id: batch.id, take });
    remaining -= take;
  }
  return { allocations, shortfall: Math.max(0, remaining) };
}

// A promo is a separate row, never a mutation of the pack, and its discounted
// price only applies if `now` actually falls inside [startsAt, expiresAt) —
// checked here explicitly rather than just displaying the date, which is the
// bug in the reference mockup this spec is based on.
export function isPromoActive(promo: { startsAt: Date; expiresAt: Date }, now: Date): boolean {
  return promo.startsAt <= now && now < promo.expiresAt;
}
