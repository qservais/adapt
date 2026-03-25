import { pgTable, uuid, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: uuid("sender_id").references(() => usersTable.id).notNull(),
  recipientId: uuid("recipient_id").references(() => usersTable.id).notNull(),
  content: text("content").notNull(),
  mediaType: varchar("media_type", { length: 10 }),
  mediaUrl: text("media_url"),
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
  isRead: boolean("is_read").default(false),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
