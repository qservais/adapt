import { pgTable, uuid, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// Coach-editable catalogue of purchasable credit packs (group-class or 1:1 credits).
export const shopPacksTable = pgTable("shop_packs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  creditType: varchar("credit_type", { length: 20 }).notNull(), // collectif | individuel
  name: varchar("name", { length: 100 }).notNull(),
  credits: integer("credits").notNull(),
  priceCents: integer("price_cents").notNull(),
  validityMonths: integer("validity_months"), // null = never expires
  tag: varchar("tag", { length: 30 }), // e.g. "POPULAIRE", "MEILLEUR PRIX" — coach can't set this yet (matches the mockup's own gap)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// A time-limited discount on a pack. Separate row, not a mutation of the pack —
// expiry is evaluated at read/purchase time, never just displayed (see shop.ts route).
export const shopPromosTable = pgTable("shop_promos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: uuid("pack_id").references(() => shopPacksTable.id, { onDelete: "cascade" }).notNull(),
  discountedPriceCents: integer("discounted_price_cents").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Fixed-tier monthly plans. Catalog rows are coach-created but the product only
// exposes price/engagement as editable (matches the client spec).
export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: uuid("coach_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  presentialText: varchar("presential_text", { length: 100 }),
  tag: varchar("tag", { length: 30 }),
  engagementMonths: integer("engagement_months"), // null = no minimum commitment
  isActive: boolean("is_active").notNull().default(true),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const subscriptionMembershipsTable = pgTable("subscription_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: uuid("athlete_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlansTable.id).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | canceled | past_due
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  engagementEndsAt: timestamp("engagement_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertShopPackSchema = createInsertSchema(shopPacksTable).omit({ id: true, coachId: true, createdAt: true, updatedAt: true });
export type InsertShopPack = z.infer<typeof insertShopPackSchema>;
export type ShopPack = typeof shopPacksTable.$inferSelect;
export type ShopPromo = typeof shopPromosTable.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type SubscriptionMembership = typeof subscriptionMembershipsTable.$inferSelect;
