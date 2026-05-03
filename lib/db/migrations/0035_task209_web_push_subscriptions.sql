-- Task #209 — Web Push notifications for the coach dashboard.
-- Stores the list of browser push subscriptions per user.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "web_push_subscriptions" jsonb DEFAULT '[]'::jsonb;
