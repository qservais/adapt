-- Task #30: Scheduled notifications by coach
-- 1. Add morning_notif_hour to users (coach setting, default 7h)
ALTER TABLE users ADD COLUMN IF NOT EXISTS morning_notif_hour smallint NOT NULL DEFAULT 7;

-- 2. Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  recurrence_type varchar(20) NOT NULL DEFAULT 'daily',
  recurrence_config jsonb DEFAULT '{}',
  send_hour smallint NOT NULL DEFAULT 8,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_coach ON scheduled_notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_athlete ON scheduled_notifications(athlete_id);
