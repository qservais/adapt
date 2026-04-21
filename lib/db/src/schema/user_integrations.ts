import { pgTable, uuid, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const userIntegrationsTable = pgTable("user_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  isConnected: boolean("is_connected").default(false).notNull(),
  /**
   * Token storage preparation:
   * These columns store OAuth access/refresh tokens.
   * IMPORTANT: Before enabling real OAuth flows, tokens MUST be encrypted at rest.
   * Recommended: AES-256-GCM via a server-side KMS (e.g. AWS KMS, Vault) or
   * application-level encryption using a secret key from environment variables.
   * The column type `text` is intentionally kept generic to accommodate encrypted blobs
   * (e.g. base64-encoded ciphertext). Migration to `bytea` is preferred for production.
   * Do NOT store plaintext tokens in production.
   */
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  externalUserId: varchar("external_user_id", { length: 255 }),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UserIntegration = typeof userIntegrationsTable.$inferSelect;
