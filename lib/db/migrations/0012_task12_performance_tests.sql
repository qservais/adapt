-- Task #12: Tests de performance + métriques avancées
-- Appliqué via drizzle-kit push et SQL direct

-- Table performance_tests (nouveau)
CREATE TABLE IF NOT EXISTS performance_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id),
  test_type varchar(50) NOT NULL,
  exercise_id uuid REFERENCES exercises(id),
  exercise_name varchar(255) NOT NULL,
  value decimal(10, 2) NOT NULL,
  unit varchar(30) NOT NULL,
  tested_at date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index pour les requêtes par athlète et type de test
CREATE INDEX IF NOT EXISTS idx_performance_tests_athlete ON performance_tests(athlete_id);
CREATE INDEX IF NOT EXISTS idx_performance_tests_type ON performance_tests(athlete_id, test_type, tested_at DESC);
