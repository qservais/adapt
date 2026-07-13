import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// General PDF resources a coach shares with athletes — contracts, workout
// guides, studio rules, etc. Distinct from nutrition_pdfs (always a single
// athlete's personalized plan): here athleteId is nullable, meaning shared
// with every athlete of that coach, same "null = everyone" convention used
// by scheduled_notifications and programs.
export const resourceFilesTable = pgTable("resource_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type ResourceFile = typeof resourceFilesTable.$inferSelect;
