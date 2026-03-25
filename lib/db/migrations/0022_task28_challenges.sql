CREATE TABLE IF NOT EXISTS "challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coach_id" uuid NOT NULL REFERENCES "users"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "metric" varchar(20) NOT NULL,
  "target" numeric(10,2) NOT NULL,
  "unit" varchar(50),
  "type" varchar(20) DEFAULT 'individual' NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "challenge_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" uuid NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "athlete_id" uuid NOT NULL REFERENCES "users"("id"),
  "progress" numeric(10,2) DEFAULT '0' NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);
