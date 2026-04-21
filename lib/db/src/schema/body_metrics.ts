import { pgTable, uuid, decimal, date, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bodyMetricsTable = pgTable("body_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id).notNull(),
  date: date("date").notNull(),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  waistCm: decimal("waist_cm", { precision: 5, scale: 1 }),
  hipsCm: decimal("hips_cm", { precision: 5, scale: 1 }),
  chestCm: decimal("chest_cm", { precision: 5, scale: 1 }),
  armCm: decimal("arm_cm", { precision: 5, scale: 1 }),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertBodyMetricSchema = createInsertSchema(bodyMetricsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBodyMetric = z.infer<typeof insertBodyMetricSchema>;
export type BodyMetric = typeof bodyMetricsTable.$inferSelect;
