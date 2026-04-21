CREATE TABLE IF NOT EXISTS "body_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "athlete_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "weight_kg" decimal(5,2),
  "waist_cm" decimal(5,1),
  "hips_cm" decimal(5,1),
  "chest_cm" decimal(5,1),
  "arm_cm" decimal(5,1),
  "notes" text,
  "photo_url" text,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "body_metrics_athlete_id_idx" ON "body_metrics"("athlete_id");
CREATE INDEX IF NOT EXISTS "body_metrics_athlete_date_idx" ON "body_metrics"("athlete_id", "date" DESC);
