import { pgTable, uuid, varchar, text, integer, boolean, date, timestamp, decimal } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SESSION_BLOCK_TYPES = ["warm_up", "strength", "power", "conditioning", "core", "cool_down"] as const;
export type SessionBlockType = typeof SESSION_BLOCK_TYPES[number];

export const programsTable = pgTable("programs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks").notNull(),
  startDate: date("start_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: uuid("program_id").references(() => programsTable.id).notNull(),
  weekNumber: integer("week_number").notNull(),
  dayNumber: integer("day_number").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  sessionType: varchar("session_type", { length: 20 }).default("online"),
  estimatedDurationMin: integer("estimated_duration_min"),
  coachNotes: text("coach_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionVariantsTable = pgTable("session_variants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => sessionsTable.id).notNull(),
  mode: varchar("mode", { length: 20 }).notNull(),
  volumeModifier: decimal("volume_modifier", { precision: 3, scale: 2 }).default("1.0"),
  intensityModifier: decimal("intensity_modifier", { precision: 3, scale: 2 }).default("1.0"),
  notes: text("notes"),
});

export const sessionBlocksTable = pgTable("session_blocks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => sessionsTable.id).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  name: varchar("name", { length: 255 }),
  notes: text("notes"),
  estimatedDurationMin: integer("estimated_duration_min"),
  conditioningFormat: varchar("conditioning_format", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertProgramSchema = createInsertSchema(programsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export const insertSessionVariantSchema = createInsertSchema(sessionVariantsTable).omit({ id: true });
export const insertSessionBlockSchema = createInsertSchema(sessionBlocksTable).omit({ id: true, createdAt: true });

export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programsTable.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type SessionVariant = typeof sessionVariantsTable.$inferSelect;
export type SessionBlock = typeof sessionBlocksTable.$inferSelect;
