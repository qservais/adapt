import { pgTable, uuid, varchar, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const mealLogsTable = pgTable("meal_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealType: varchar("meal_type", { length: 50 }).notNull(),
  description: text("description"),
  proteinG: integer("protein_g").default(0).notNull(),
  carbsG: integer("carbs_g").default(0).notNull(),
  fatG: integer("fat_g").default(0).notNull(),
  kcal: integer("kcal").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nutritionGoalsTable = pgTable("nutrition_goals", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  proteinG: integer("protein_g").default(150).notNull(),
  carbsG: integer("carbs_g").default(250).notNull(),
  fatG: integer("fat_g").default(70).notNull(),
  kcal: integer("kcal").default(2200).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const nutritionPdfsTable = pgTable("nutrition_pdfs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  athleteId: uuid("athlete_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
