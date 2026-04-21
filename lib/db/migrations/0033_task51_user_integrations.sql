CREATE TABLE IF NOT EXISTS "user_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "provider" varchar(50) NOT NULL,
  "is_connected" boolean NOT NULL DEFAULT false,
  "access_token" text,
  "refresh_token" text,
  "external_user_id" varchar(255),
  "connected_at" timestamptz,
  "last_sync_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  UNIQUE("user_id", "provider")
);
