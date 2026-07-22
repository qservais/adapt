import { pgTable, uuid, smallint, boolean, text, varchar, date, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const checkinsTable = pgTable("checkins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  date: date("date").notNull(),
  sleep: smallint("sleep"),
  energy: smallint("energy"),
  stress: smallint("stress"),
  // Retained for historical rows only — dropped from the V1 check-in and no
  // longer written or read by the ADAPT score (see adapt-engine.ts).
  soreness: smallint("soreness"),
  motivation: smallint("motivation"),
  hasPain: boolean("has_pain").default(false),
  painZone: varchar("pain_zone", { length: 20 }),
  painIntensity: smallint("pain_intensity"),
  painNotes: text("pain_notes"),
  cyclePhase: varchar("cycle_phase", { length: 20 }),
  adaptScore: smallint("adapt_score").notNull(),
  sessionMode: varchar("session_mode", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertCheckinSchema = createInsertSchema(checkinsTable).omit({ id: true, createdAt: true });
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type Checkin = typeof checkinsTable.$inferSelect;
