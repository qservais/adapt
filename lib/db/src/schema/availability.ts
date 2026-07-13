import { pgTable, uuid, varchar, smallint, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// Recurring weekly template of open 1:1 slots ("every Monday at 09:00, 10:00,
// 17:00"). A member requesting a specific date+time picks one of these; the
// concrete request/booking lives in coach_appointments, not here.
export const coachAvailabilitySlotsTable = pgTable("coach_availability_slots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: smallint("day_of_week").notNull(), // 0=Sunday .. 6=Saturday
  startTime: varchar("start_time", { length: 5 }).notNull(), // "HH:MM"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CoachAvailabilitySlot = typeof coachAvailabilitySlotsTable.$inferSelect;
