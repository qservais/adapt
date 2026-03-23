import { pgTable, uuid, varchar, decimal, text, date, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const performanceTestsTable = pgTable("performance_tests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  coachId: uuid("coach_id").references(() => usersTable.id),
  testType: varchar("test_type", { length: 50 }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id),
  exerciseName: varchar("exercise_name", { length: 100 }),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  testedAt: date("tested_at").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPerformanceTestSchema = createInsertSchema(performanceTestsTable).omit({ id: true, createdAt: true });
export type InsertPerformanceTest = z.infer<typeof insertPerformanceTestSchema>;
export type PerformanceTest = typeof performanceTestsTable.$inferSelect;
