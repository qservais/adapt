import { pgTable, uuid, varchar, jsonb, timestamp, integer, decimal, text } from "drizzle-orm/pg-core";
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
  createdBy: uuid("created_by").references(() => usersTable.id),
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
  coachCue: text("coach_cue"),
  supersetGroup: varchar("superset_group", { length: 5 }),
  supersetLabel: varchar("superset_label", { length: 5 }),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export const insertSessionExerciseSchema = createInsertSchema(sessionExercisesTable).omit({ id: true });

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
export type SessionExercise = typeof sessionExercisesTable.$inferSelect;
