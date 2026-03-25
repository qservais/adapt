ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "scheduled_time" varchar(5);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "visio_link" text;
