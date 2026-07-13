import { pgTable, uuid, decimal, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";
import { sessionLogsTable } from "./session_logs";

export const prHistoryTable = pgTable("pr_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercisesTable.id).notNull(),
  loadKg: decimal("load_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).defaultNow().notNull(),
  sessionLogId: uuid("session_log_id").references(() => sessionLogsTable.id),
});

export type PRHistory = typeof prHistoryTable.$inferSelect;
