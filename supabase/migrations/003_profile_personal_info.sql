-- ============================================================
-- 003_profile_personal_info.sql
--
-- Adds full_name and city columns to profiles, backfills full_name
-- from display_name for existing rows, and updates handle_new_user()
-- to populate full_name on signup (email and OAuth paths).
--
-- Safe to re-apply: all operations are idempotent.
--
-- Run via Supabase SQL Editor, or:
--   npx supabase db push
-- ============================================================


-- ── profiles: personal info columns ─────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;


-- ── backfill: seed full_name from display_name ───────────────
UPDATE profiles SET full_name = display_name WHERE full_name IS NULL;


-- ── trigger function: also populate full_name on signup ──────
-- CREATE OR REPLACE preserves the existing trigger binding from 001;
-- no DROP/CREATE TRIGGER needed.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
