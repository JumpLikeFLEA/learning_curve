-- ============================================================
-- 001_initial_schema.sql
-- Run this once against your Supabase project via:
--   npx supabase db push
-- or paste into the Supabase SQL Editor.
-- ============================================================


-- ── profiles ────────────────────────────────────────────────
-- Extends auth.users. A row is auto-created by the trigger below.
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT        NOT NULL DEFAULT 'Student',
  role            TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_xp        INTEGER     NOT NULL DEFAULT 0,
  current_streak  INTEGER     NOT NULL DEFAULT 0,
  longest_streak  INTEGER     NOT NULL DEFAULT 0,
  last_quiz_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner read/write"
  ON profiles USING (auth.uid() = id);


-- ── questions ────────────────────────────────────────────────
-- Seeded from data/questions.json via scripts/seed-questions.ts.
CREATE TABLE IF NOT EXISTS questions (
  id             TEXT        PRIMARY KEY,
  type           TEXT        NOT NULL DEFAULT 'multiple_choice',
  subject        TEXT        NOT NULL,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  difficulty     TEXT        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question       TEXT        NOT NULL,
  options        TEXT[]      NOT NULL,
  correct_answer TEXT        NOT NULL,
  explanation    TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source         TEXT        NOT NULL CHECK (source IN ('manual', 'ai_generated')),
  created_by     UUID        REFERENCES profiles(id)
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions: public read"
  ON questions FOR SELECT USING (true);

CREATE POLICY "questions: admin write"
  ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── quizzes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id              TEXT        PRIMARY KEY,
  title           TEXT        NOT NULL,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  difficulty_mix  TEXT        NOT NULL,
  question_ids    TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode            TEXT        NOT NULL DEFAULT 'ordinary' CHECK (mode IN ('ordinary', 'exam')),
  created_by      UUID        REFERENCES profiles(id)
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read quizzes (needed to play them)
CREATE POLICY "quizzes: authenticated read"
  ON quizzes FOR SELECT USING (auth.uid() IS NOT NULL);

-- Any authenticated user can insert (quiz is created when starting a session)
CREATE POLICY "quizzes: authenticated insert"
  ON quizzes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only the creator or an admin can update/delete
CREATE POLICY "quizzes: creator or admin write"
  ON quizzes FOR ALL USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── results ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id                TEXT        PRIMARY KEY,
  quiz_id           TEXT        NOT NULL REFERENCES quizzes(id),
  user_id           UUID        NOT NULL REFERENCES profiles(id),
  mode              TEXT        NOT NULL CHECK (mode IN ('ordinary', 'exam')),
  score             NUMERIC     NOT NULL,
  total_questions   INTEGER     NOT NULL,
  correct           INTEGER     NOT NULL,
  tag_breakdown     JSONB       NOT NULL DEFAULT '{}',
  wrong_question_ids TEXT[]     NOT NULL DEFAULT '{}',
  grading_type      TEXT        NOT NULL DEFAULT 'auto',
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken        INTEGER
);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results: owner read/write"
  ON results USING (auth.uid() = user_id);

-- Admin can read all results
CREATE POLICY "results: admin read"
  ON results FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── user_achievements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT        NOT NULL,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_achievements: owner read/write"
  ON user_achievements USING (auth.uid() = user_id);


-- ── custom_quizzes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_quizzes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  subject     TEXT,
  questions   JSONB       NOT NULL DEFAULT '[]',
  is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_quizzes ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "custom_quizzes: owner write"
  ON custom_quizzes USING (auth.uid() = user_id);

-- Anyone (including anon) can read public quizzes
CREATE POLICY "custom_quizzes: public read"
  ON custom_quizzes FOR SELECT USING (is_public = TRUE);


-- ── trigger: auto-create profile on signup ───────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
