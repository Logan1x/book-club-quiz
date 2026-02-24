-- 001: cohorts + better quiz storage + attempt answers

-- Cohorts
CREATE TABLE IF NOT EXISTS cohorts (
  cohort_code TEXT PRIMARY KEY,
  cohort_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cohort ↔ quizzes mapping (cohort can have multiple quizzes)
CREATE TABLE IF NOT EXISTS cohort_quizzes (
  cohort_code TEXT NOT NULL REFERENCES cohorts(cohort_code) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cohort_code, quiz_id)
);

-- Store quiz content in DB (Vercel-safe)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS answer_key JSONB;

-- Attempts: add participant_key + answers JSON
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS participant_key TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers JSONB;

CREATE INDEX IF NOT EXISTS idx_attempts_participant ON attempts(quiz_id, cohort, participant_key);
