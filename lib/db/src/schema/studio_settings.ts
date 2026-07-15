import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// One row per coach/studio. Holds the studio-specific values the product spec
// explicitly calls out as "placeholders to replace" (WhatsApp number, cancellation
// window, VAT regime...) so they live in data, not hardcoded in app code.
export const studioSettingsTable = pgTable("studio_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  studioName: varchar("studio_name", { length: 150 }).notNull().default("Mouv'Up"),
  studioAddress: text("studio_address"),
  whatsappNumber: varchar("whatsapp_number", { length: 30 }),
  announcementLink: text("announcement_link"),
  defaultCancellationWindowHours: integer("default_cancellation_window_hours").notNull().default(24),
  // franchise (art. 56bis, no VAT line) | assujetti (21% VAT, HT/TVA/TTC breakdown)
  vatRegime: varchar("vat_regime", { length: 20 }).notNull().default("franchise"),
  vatNumber: varchar("vat_number", { length: 30 }),
  invoicePrefix: varchar("invoice_prefix", { length: 10 }).notNull().default("NH"),
  accountantEmail: varchar("accountant_email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertStudioSettingsSchema = createInsertSchema(studioSettingsTable).omit({
  id: true,
  coachId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudioSettings = z.infer<typeof insertStudioSettingsSchema>;
export type StudioSettings = typeof studioSettingsTable.$inferSelect;
