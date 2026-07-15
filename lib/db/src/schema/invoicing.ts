import { pgTable, uuid, varchar, integer, smallint, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// One row per (coach, year, series) — the atomic "get next number" counter.
// Incremented via an upsert (ON CONFLICT DO UPDATE lastNumber+1), which is
// itself atomic in Postgres, so no explicit row lock is needed to guarantee
// gapless numbering under concurrent invoice creation.
export const invoiceNumberSequencesTable = pgTable("invoice_number_sequences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  year: smallint("year").notNull(),
  series: varchar("series", { length: 20 }).notNull(), // invoice | credit_note
  lastNumber: integer("last_number").notNull().default(0),
});

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull().unique(),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  // Snapshotted at issue time — a later regime change in studio_settings must
  // never rewrite the meaning of a past invoice.
  regime: varchar("regime", { length: 20 }).notNull(),
  vatNumber: varchar("vat_number", { length: 30 }),
  amountHtCents: integer("amount_ht_cents").notNull(),
  vatCents: integer("vat_cents").notNull(),
  amountTtcCents: integer("amount_ttc_cents").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // stripe | credit | cash
  sourceType: varchar("source_type", { length: 30 }).notNull(), // shop_purchase | class_booking | one_on_one | subscription | manual
  // Not a uuid FK — holds either an internal record id (pack/booking) or an
  // external Stripe object id (e.g. subscription invoice "in_..."), used for
  // idempotency checks (see webhooks.ts's invoice.paid handler).
  sourceId: varchar("source_id", { length: 255 }),
  pdfObjectName: text("pdf_object_name"),
  status: varchar("status", { length: 20 }).notNull().default("issued"), // issued | credited
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const creditNotesTable = pgTable("credit_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  creditNoteNumber: varchar("credit_note_number", { length: 30 }).notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  pdfObjectName: text("pdf_object_name"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type CreditNote = typeof creditNotesTable.$inferSelect;
