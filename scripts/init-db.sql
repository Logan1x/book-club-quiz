-- book-club-quiz: initial schema (local postgres)

CREATE TABLE IF NOT EXISTS quizzes (
  quiz_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 360,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attempts (
  attempt_id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  cohort TEXT NOT NULL,
  display_name TEXT,
  whatsapp TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  duration_ms INTEGER,
  correct INTEGER,
  total INTEGER,
  score_pct INTEGER,
  timed_out BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_quiz_cohort ON attempts(quiz_id, cohort);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON attempts(quiz_id, cohort, submitted_at);
