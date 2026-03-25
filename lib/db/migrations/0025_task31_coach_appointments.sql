-- Task #31: Coach appointments (RDV présentiel)
CREATE TABLE IF NOT EXISTS coach_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  duration_min smallint NOT NULL DEFAULT 60,
  location varchar(255),
  notes text,
  type varchar(20) NOT NULL DEFAULT 'presentiel',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_appointments_coach ON coach_appointments(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_appointments_athlete ON coach_appointments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_appointments_start ON coach_appointments(start_at);
