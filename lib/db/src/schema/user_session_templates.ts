import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  loadKg?: number | null;
  restSeconds?: number | null;
}

export const userSessionTemplatesTable = pgTable("user_session_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  exercises: jsonb("exercises").$type<TemplateExercise[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSessionTemplateSchema = createInsertSchema(userSessionTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSessionTemplate = z.infer<typeof insertUserSessionTemplateSchema>;
export type UserSessionTemplate = typeof userSessionTemplatesTable.$inferSelect;
