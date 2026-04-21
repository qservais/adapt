import { pgTable, uuid, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const userIntegrationsTable = pgTable("user_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  isConnected: boolean("is_connected").default(false).notNull(),
  /** AES-256-GCM encrypted OAuth tokens (format: iv:authTag:ciphertext hex) */
  accessToken: text("access_token"),
  /** AES-256-GCM encrypted OAuth refresh token */
  refreshToken: text("refresh_token"),
  externalUserId: varchar("external_user_id", { length: 255 }),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UserIntegration = typeof userIntegrationsTable.$inferSelect;
