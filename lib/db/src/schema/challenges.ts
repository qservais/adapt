import { pgTable, uuid, varchar, text, integer, decimal, timestamp, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const challengesTable = pgTable("challenges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  metric: varchar("metric", { length: 20 }).notNull(),
  target: decimal("target", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  type: varchar("type", { length: 20 }).default("individual").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const challengeAssignmentsTable = pgTable("challenge_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: uuid("challenge_id").references(() => challengesTable.id, { onDelete: "cascade" }).notNull(),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  progress: decimal("progress", { precision: 10, scale: 2 }).default("0").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
