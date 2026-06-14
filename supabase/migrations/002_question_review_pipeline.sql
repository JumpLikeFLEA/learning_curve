-- ============================================================
-- 002_question_review_pipeline.sql
--
-- Adds the question review pipeline that supports AI generation:
--   • status column on questions (pending / approved / rejected)
--   • critic_notes JSONB for the AI critic's structured feedback
--   • content_hash for exact-match dedup
--   • generation_batch_id link to the per-run audit table
--   • reviewed_at / reviewed_by for admin review tracking
--   • generation_batches table for per-run audit trail
--   • updated RLS so only approved questions are publicly readable
--
-- Safe to re-apply: all operations are idempotent.
--
-- Run via Supabase SQL Editor, or:
--   npx supabase db push
-- ============================================================


-- ── questions: review pipeline columns ──────────────────────
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS critic_notes        JSONB,
  ADD COLUMN IF NOT EXISTS content_hash        TEXT,
  ADD COLUMN IF NOT EXISTS generation_batch_id UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by         UUID REFERENCES profiles(id);


-- ── backfill: existing manual questions stay visible ────────
-- New columns default to 'pending', so any questions inserted before this
-- migration would suddenly disappear from the public quiz pool. Promote
-- already-existing manually-authored questions to 'approved' to preserve
-- continuity. New rows (manual or AI-generated) still default to 'pending'
-- and must be explicitly approved via the admin review queue.
UPDATE questions
  SET status = 'approved'
  WHERE source = 'manual'
    AND status = 'pending';


-- ── indexes ─────────────────────────────────────────────────
-- Exact-match dedup: unique on content_hash where present. Manual questions
-- may not have a hash, so the partial WHERE clause skips NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS questions_content_hash_idx
  ON questions(content_hash)
  WHERE content_hash IS NOT NULL;

-- Admin review queue lookup is dominated by status filtering.
CREATE INDEX IF NOT EXISTS questions_status_idx
  ON questions(status);


-- ── RLS: replace the open public-read policy ────────────────
-- Original policy allowed SELECT on every row. Tighten it so non-admins only
-- see approved questions. Admins keep full visibility via the explicit
-- read-all policy below (defensive — doesn't rely on the existing
-- "questions: admin write" FOR ALL policy to also cover SELECT).
DROP POLICY IF EXISTS "questions: public read"          ON questions;
DROP POLICY IF EXISTS "questions: public read approved" ON questions;

CREATE POLICY "questions: public read approved"
  ON questions FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "questions: admin read all" ON questions;

CREATE POLICY "questions: admin read all"
  ON questions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── generation_batches: per-run audit trail ─────────────────
-- One row per call to the generator service. Lets us answer questions like
-- "which prompts produced the most rejected questions?" once we have a
-- review history.
CREATE TABLE IF NOT EXISTS generation_batches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          TEXT        NOT NULL,
  difficulty       TEXT        NOT NULL,
  subtopics        TEXT[]      NOT NULL DEFAULT '{}',
  generation_notes TEXT,
  requested_count  INTEGER     NOT NULL,
  generated_count  INTEGER     NOT NULL DEFAULT 0,
  rejected_count   INTEGER     NOT NULL DEFAULT 0,
  generator_model  TEXT        NOT NULL,
  critic_model     TEXT        NOT NULL,
  created_by       UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE generation_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generation_batches: admin only" ON generation_batches;

CREATE POLICY "generation_batches: admin only"
  ON generation_batches USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );