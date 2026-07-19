import { pgTable, uuid, varchar, jsonb, timestamp, integer, decimal, text, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { sessionVariantsTable, sessionBlocksTable } from "./programs";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exercisesTable = pgTable("exercises", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }),
  muscleGroups: jsonb("muscle_groups"),
  equipment: jsonb("equipment"),
  description: text("description"),
  demoUrl: varchar("demo_url", { length: 500 }),
  demoGifUrl: varchar("demo_gif_url", { length: 500 }),
  level: varchar("level", { length: 20 }),
  createdBy: uuid("created_by").references(() => usersTable.id),
  // Which metric PR detection should track for this exercise: load (max
  // kg — the historical default, unchanged for every pre-existing
  // exercise), bodyweight (max reps), time (best/lowest seconds), or
  // distance (max meters). See prService.ts.
  trackingType: varchar("tracking_type", { length: 20 }).notNull().default("load"),
  // Provenance for bulk-imported catalogue entries (e.g. the exercises-dataset
  // seed) — lets the importer upsert idempotently on re-run instead of
  // duplicating rows, and keeps required attribution traceable. Null for
  // exercises a coach created by hand.
  externalSource: varchar("external_source", { length: 50 }),
  externalId: varchar("external_id", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionExercisesTable = pgTable("session_exercises", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  variantId: uuid("variant_id").references(() => sessionVariantsTable.id).notNull(),
  blockId: uuid("block_id").references(() => sessionBlocksTable.id),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  sets: integer("sets").notNull(),
  reps: varchar("reps", { length: 20 }),
  loadKg: decimal("load_kg", { precision: 6, scale: 2 }),
  restSeconds: integer("rest_seconds"),
  durationSeconds: integer("duration_seconds"),
  coachCue: text("coach_cue"),
  tempo: varchar("tempo", { length: 10 }),
  supersetGroup: varchar("superset_group", { length: 5 }),
  supersetLabel: varchar("superset_label", { length: 5 }),
});

export const athleteExercisePreferencesTable = pgTable("athlete_exercise_preferences", {
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id).notNull(),
  preferredSets: integer("preferred_sets"),
  preferredReps: varchar("preferred_reps", { length: 20 }),
  preferredLoadKg: decimal("preferred_load_kg", { precision: 6, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.athleteId, t.exerciseId] })]);

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export const insertSessionExerciseSchema = createInsertSchema(sessionExercisesTable).omit({ id: true });

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
export type SessionExercise = typeof sessionExercisesTable.$inferSelect;
export type AthleteExercisePreference = typeof athleteExercisePreferencesTable.$inferSelect;
