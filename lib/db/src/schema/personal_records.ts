import { pgTable, uuid, decimal, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";
import { sessionLogsTable } from "./session_logs";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personalRecordsTable = pgTable("personal_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id).notNull(),
  // Mirrors the exercise's own trackingType at the time this PR was set —
  // determines which of the four value columns below is the tracked metric.
  // Still exactly one row per (userId, exerciseId), same as before
  // generalization: an exercise has one trackingType, so it can only ever
  // produce one kind of record.
  recordType: varchar("record_type", { length: 20 }).notNull().default("load"),
  loadKg: decimal("load_kg", { precision: 6, scale: 2 }),
  reps: integer("reps"),
  durationSeconds: integer("duration_seconds"),
  distanceMeters: decimal("distance_meters", { precision: 8, scale: 2 }),
  previousLoadKg: decimal("previous_load_kg", { precision: 6, scale: 2 }),
  previousReps: integer("previous_reps"),
  previousDurationSeconds: integer("previous_duration_seconds"),
  previousDistanceMeters: decimal("previous_distance_meters", { precision: 8, scale: 2 }),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).defaultNow().notNull(),
  sessionLogId: uuid("session_log_id").references(() => sessionLogsTable.id),
});

export const insertPersonalRecordSchema = createInsertSchema(personalRecordsTable).omit({ id: true });

export type PersonalRecord = typeof personalRecordsTable.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
