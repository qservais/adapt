-- Task 26: Daily step counter + reorderable stats sections

-- Add stats_order column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats_order json;

-- Create daily_steps table
CREATE TABLE IF NOT EXISTS daily_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer NOT NULL,
  goal integer NOT NULL DEFAULT 10000,
  source varchar(20) NOT NULL DEFAULT 'manual',
  CONSTRAINT daily_steps_user_id_date_key UNIQUE (user_id, date)
);
