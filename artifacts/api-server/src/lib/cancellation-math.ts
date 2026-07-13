// Pure predicate, no imports — see tests/booking.test.ts. Kept separate from
// booking.service.ts (which is DB-transaction-coupled) for the same reason
// lib/ledger-math.ts is separate from credit-ledger.service.ts.

// "Late" = inside the coach's (or studio default) cancellation window. Per
// spec: late cancellations still consume the credit; on-time ones are
// auto-refunded. The boundary is inclusive of the window edge itself — being
// cancelled at exactly `windowHours` before start counts as late, matching
// the club's "dans les X heures" (within X hours) phrasing.
export function isLateCancellation(classStartAt: Date, now: Date, windowHours: number): boolean {
  const hoursUntilClass = (classStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilClass <= windowHours;
}
