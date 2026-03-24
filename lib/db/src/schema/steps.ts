import { pgTable, uuid, integer, varchar, date, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const dailyStepsTable = pgTable("daily_steps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  steps: integer("steps").notNull(),
  goal: integer("goal").notNull().default(10000),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
}, (t) => ({
  userDateUnique: unique().on(t.userId, t.date),
}));
