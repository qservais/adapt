ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "link" varchar(512);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notification_prefs" jsonb;
