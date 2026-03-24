import { pgTable, uuid, varchar, boolean, integer, decimal, timestamp, date, text, jsonb, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  authProvider: varchar("auth_provider", { length: 20 }).default("email"),
  providerId: varchar("provider_id", { length: 255 }),
  role: varchar("role", { length: 10 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  gender: varchar("gender", { length: 10 }),
  birthDate: date("birth_date"),
  age: integer("age"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: integer("height_cm"),
  trainingFrequency: integer("training_frequency"),
  injuries: text("injuries"),
  fitnessLevel: varchar("fitness_level", { length: 20 }),
  primaryGoal: varchar("primary_goal", { length: 20 }),
  cycleTracking: boolean("cycle_tracking").default(false),
  lastPeriodDate: date("last_period_date"),
  avgCycleDays: integer("avg_cycle_days").default(28),
  coachId: uuid("coach_id"),
  inviteCode: varchar("invite_code", { length: 6 }).unique(),
  refreshToken: varchar("refresh_token", { length: 512 }),
  notificationPrefs: jsonb("notification_prefs"),
  statsOrder: json("stats_order").$type<string[]>(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
