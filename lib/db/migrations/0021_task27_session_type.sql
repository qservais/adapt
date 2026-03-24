ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type varchar(20) DEFAULT 'online';
