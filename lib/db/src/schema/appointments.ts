import { pgTable, uuid, varchar, text, smallint, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const coachAppointmentsTable = pgTable("coach_appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  durationMin: smallint("duration_min").notNull().default(60),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  type: varchar("type", { length: 20 }).notNull().default("presentiel"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type CoachAppointment = typeof coachAppointmentsTable.$inferSelect;
