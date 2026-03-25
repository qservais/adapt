-- task33: Add level column to exercises (débutant / intermédiaire / avancé)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS level VARCHAR(20);
