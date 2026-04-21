ALTER TABLE "messages" ALTER COLUMN "media_type" TYPE varchar(50);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "file_name" varchar(255);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "file_size" text;
