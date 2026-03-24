ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "last_period_date" date,
  ADD COLUMN IF NOT EXISTS "avg_cycle_days" integer DEFAULT 28;
