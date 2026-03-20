import { pgTable, uuid, decimal, integer, timestamp } from "drizzle-orm/pg-core";
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
  loadKg: decimal("load_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  previousLoadKg: decimal("previous_load_kg", { precision: 6, scale: 2 }),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).defaultNow().notNull(),
  sessionLogId: uuid("session_log_id").references(() => sessionLogsTable.id),
});

export const insertPersonalRecordSchema = createInsertSchema(personalRecordsTable).omit({ id: true });

export type PersonalRecord = typeof personalRecordsTable.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
