import { pgTable, uuid, varchar, smallint, text, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { sessionsTable } from "./programs";
import { checkinsTable } from "./checkins";
import { exercisesTable } from "./exercises";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionLogsTable = pgTable("session_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  sessionId: uuid("session_id").references(() => sessionsTable.id),
  variantMode: varchar("variant_mode", { length: 20 }).notNull(),
  checkinId: uuid("checkin_id").references(() => checkinsTable.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rpe: smallint("rpe"),
  perceivedDifficulty: varchar("perceived_difficulty", { length: 20 }),
  athleteNotes: text("athlete_notes"),
  theme: varchar("theme", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const exerciseLogsTable = pgTable("exercise_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionLogId: uuid("session_log_id").references(() => sessionLogsTable.id).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id).notNull(),
  setsCompleted: integer("sets_completed"),
  repsPerSet: jsonb("reps_per_set"),
  loadKgUsed: decimal("load_kg_used", { precision: 6, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertSessionLogSchema = createInsertSchema(sessionLogsTable).omit({ id: true, createdAt: true });
export const insertExerciseLogSchema = createInsertSchema(exerciseLogsTable).omit({ id: true });

export type InsertSessionLog = z.infer<typeof insertSessionLogSchema>;
export type SessionLog = typeof sessionLogsTable.$inferSelect;
export type ExerciseLog = typeof exerciseLogsTable.$inferSelect;
