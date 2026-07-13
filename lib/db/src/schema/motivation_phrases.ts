import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-coach bank of morning-motivation phrases. Replaces the hardcoded
// PHRASES_MOTIVATION array previously baked into notification-job.ts so a
// coach can tune their own voice without a code deploy. Seeded with the
// original 20 French phrases for every existing coach on migration.
export const motivationPhrasesTable = pgTable("motivation_phrases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertMotivationPhraseSchema = createInsertSchema(motivationPhrasesTable).omit({
  id: true,
  coachId: true,
  createdAt: true,
});
export type InsertMotivationPhrase = z.infer<typeof insertMotivationPhraseSchema>;
export type MotivationPhrase = typeof motivationPhrasesTable.$inferSelect;
