import { pgTable, uuid, text, boolean, timestamp, varchar, smallint, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: uuid("sender_id").references(() => usersTable.id).notNull(),
  recipientId: uuid("recipient_id").references(() => usersTable.id).notNull(),
  content: text("content").notNull(),
  mediaType: varchar("media_type", { length: 50 }),
  mediaUrl: text("media_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: text("file_size"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 512 }),
  // Identifies the row that triggered this notification (e.g. a
  // scheduled_notifications.id), so idempotency/dedup checks can query a
  // real column instead of grepping the rendered body text for a marker.
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: uuid("source_id"),
  isRead: boolean("is_read").default(false),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const scheduledNotificationsTable = pgTable("scheduled_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  recurrenceType: varchar("recurrence_type", { length: 20 }).notNull().default("daily"),
  recurrenceConfig: jsonb("recurrence_config").$type<Record<string, unknown>>().default({}),
  sendHour: smallint("send_hour").notNull().default(8),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type ScheduledNotification = typeof scheduledNotificationsTable.$inferSelect;
