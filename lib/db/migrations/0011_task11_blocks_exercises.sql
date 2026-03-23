-- Task #11: Blocs modulaires + Bibliothèque d'exercices
-- Applied via drizzle-kit push and direct SQL

-- 1. session_blocks table (new)
CREATE TABLE IF NOT EXISTS session_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type varchar(30) NOT NULL,
  order_index integer NOT NULL,
  name varchar(255),
  notes text,
  estimated_duration_min integer,
  conditioning_format varchar(20),
  created_at timestamptz DEFAULT now()
);

-- 2. session_exercises: new columns (backfill-safe, all nullable)
ALTER TABLE session_exercises
  ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES session_blocks(id),
  ADD COLUMN IF NOT EXISTS superset_group varchar(5),
  ADD COLUMN IF NOT EXISTS superset_label varchar(5),
  ADD COLUMN IF NOT EXISTS tempo varchar(10);

-- 3. exercises: description column (nullable backfill-safe)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS description text;

-- Index for block-based lookups
CREATE INDEX IF NOT EXISTS idx_session_exercises_block_id ON session_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_session_blocks_session_id ON session_blocks(session_id);
