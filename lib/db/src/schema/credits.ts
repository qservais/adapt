import { pgTable, uuid, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { shopPacksTable } from "./shop";

export const CREDIT_TYPES = ["collectif", "individuel"] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

// A ledger of purchased/gifted credit lots, not a flat counter — each lot has its
// own expiry (per the client spec's per-purchase validity) and consumption is
// FIFO by soonest-expiry (see services/credit-ledger.service.ts).
export const creditBatchesTable = pgTable("credit_batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  creditType: varchar("credit_type", { length: 20 }).notNull(),
  creditsTotal: integer("credits_total").notNull(),
  creditsRemaining: integer("credits_remaining").notNull(),
  source: varchar("source", { length: 20 }).notNull(), // purchase | gift
  packId: uuid("pack_id").references(() => shopPacksTable.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  pricePaidCents: integer("price_paid_cents"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = never expires
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Append-only audit trail. One row per debit/credit against a specific batch —
// never mutate a batch's history, only its creditsRemaining counter.
export const creditTransactionsTable = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  batchId: uuid("batch_id").references(() => creditBatchesTable.id, { onDelete: "cascade" }).notNull(),
  delta: integer("delta").notNull(), // negative = consumed, positive = credited/refunded
  reason: varchar("reason", { length: 30 }).notNull(), // purchase | gift | booking | cancellation_refund | waitlist_confirm | manual_adjustment
  relatedBookingId: uuid("related_booking_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CreditBatch = typeof creditBatchesTable.$inferSelect;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
