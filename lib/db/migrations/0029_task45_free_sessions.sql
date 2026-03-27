ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "is_free_session" boolean NOT NULL DEFAULT false;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "free_session_name" varchar(255);
