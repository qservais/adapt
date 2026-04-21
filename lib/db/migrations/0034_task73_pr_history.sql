CREATE TABLE IF NOT EXISTS "pr_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "exercise_id" uuid NOT NULL REFERENCES "exercises"("id"),
  "load_kg" numeric(6, 2) NOT NULL,
  "reps" integer NOT NULL,
  "achieved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "session_log_id" uuid REFERENCES "session_logs"("id")
);
