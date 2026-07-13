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
  phone: varchar("phone", { length: 30 }),
  // 6-digit numeric login PIN (athlete-app passwordless auth), stored hashed like passwordHash.
  loginCodeHash: varchar("login_code_hash", { length: 255 }),
  // PAR-Q-style safety triage, distinct from the free-text `injuries` field above.
  hasInjuryHistory: boolean("has_injury_history"),
  medicalContraindication: boolean("medical_contraindication"),
  acquisitionSource: varchar("acquisition_source", { length: 50 }),
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
  consentVersion: varchar("consent_version", { length: 20 }),
  notificationPrefs: jsonb("notification_prefs"),
  webPushSubscriptions: jsonb("web_push_subscriptions").$type<Array<{ endpoint: string; keys: { p256dh: string; auth: string }; createdAt?: string }>>().default([]),
  statsOrder: json("stats_order").$type<string[]>(),
  avatarUrl: text("avatar_url"),
  morningNotifHour: integer("morning_notif_hour").default(7),
  pushToken: text("push_token"),
  secondaryGoal: text("secondary_goal"),
  sessionDurationMin: integer("session_duration_min"),
  sessionDurationMax: integer("session_duration_max"),
  availableDays: jsonb("available_days").$type<string[]>(),
  trainingLocations: jsonb("training_locations").$type<string[]>(),
  equipment: jsonb("equipment").$type<string[]>(),
  avoidedExercises: jsonb("avoided_exercises").$type<string[]>(),
  favoriteExercises: jsonb("favorite_exercises").$type<string[]>(),
  language: varchar("language", { length: 10 }).default("fr"),
  theme: varchar("theme", { length: 20 }).default("dark"),
  units: varchar("units", { length: 10 }).default("metric"),
  privacySettings: jsonb("privacy_settings").$type<{ shareWeight?: boolean; shareSleep?: boolean; shareHeartRate?: boolean; shareBodyFat?: boolean }>(),
  passwordResetToken: varchar("password_reset_token", { length: 64 }),
  passwordResetExpiry: timestamp("password_reset_expiry", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
