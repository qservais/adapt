import { pgTable, uuid, varchar, integer, boolean, timestamp, text, smallint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// Coach-editable catalogue of bookable group classes (name/capacity/price),
// separate from the individually-authored training `sessions` table — those
// are one program, one athlete; these are many athletes, capacity, payment.
export const classTemplatesTable = pgTable("class_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(12),
  priceCents: integer("price_cents").notNull().default(0),
  creditCost: integer("credit_cost").notNull().default(1),
  durationMin: integer("duration_min").notNull().default(60),
  // Overrides studio_settings.defaultCancellationWindowHours when set.
  cancellationWindowHours: integer("cancellation_window_hours"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Weekly-recurring generation rule. A one-off class just gets a single
// class_occurrences row with no recurrence rule behind it.
export const classRecurrenceRulesTable = pgTable("class_recurrence_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").references(() => classTemplatesTable.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: smallint("day_of_week").notNull(), // 0=Sunday .. 6=Saturday
  startTime: varchar("start_time", { length: 5 }).notNull(), // "HH:MM"
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// The single source of truth for "when is this class actually happening" —
// read by both the coach agenda and the member booking screen. The reference
// mockup keeps these as two disconnected data stores; that split is a mockup
// bug, not a requirement, and is not reproduced here.
export const classOccurrencesTable = pgTable("class_occurrences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").references(() => classTemplatesTable.id, { onDelete: "cascade" }).notNull(),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  recurrenceRuleId: uuid("recurrence_rule_id").references(() => classRecurrenceRulesTable.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull(),
  capacity: integer("capacity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | cancelled
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationNote: text("cancellation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const classBookingsTable = pgTable("class_bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  occurrenceId: uuid("occurrence_id").references(() => classOccurrencesTable.id, { onDelete: "cascade" }).notNull(),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }),
  // Trial/guest participants can exist without an account (coach manual registration).
  guestName: varchar("guest_name", { length: 150 }),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"), // confirmed | cancelled
  paymentMode: varchar("payment_mode", { length: 20 }).notNull(), // credit | stripe | comped | pay_on_site
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("paid"), // pending | paid | refunded — only meaningful for stripe
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  registeredBy: varchar("registered_by", { length: 20 }).notNull().default("self"), // self | coach
  lateCancellation: boolean("late_cancellation").notNull().default(false),
  lateCancellationWaived: boolean("late_cancellation_waived").notNull().default(false),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const classWaitlistEntriesTable = pgTable("class_waitlist_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  occurrenceId: uuid("occurrence_id").references(() => classOccurrencesTable.id, { onDelete: "cascade" }).notNull(),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting | offered | expired | confirmed | withdrawn
  offeredAt: timestamp("offered_at", { withTimezone: true }),
  offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type ClassTemplate = typeof classTemplatesTable.$inferSelect;
export type ClassOccurrence = typeof classOccurrencesTable.$inferSelect;
export type ClassBooking = typeof classBookingsTable.$inferSelect;
export type ClassWaitlistEntry = typeof classWaitlistEntriesTable.$inferSelect;
