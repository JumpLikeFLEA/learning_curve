-- ============================================================
-- 036_terms_acceptance.sql
--
-- Records the user's acceptance of the Terms of Service and Privacy Policy at
-- sign-up, for the 1.0 legal surface (clickwrap in AuthScreen + an "I am 16 or
-- over" declaration).
--
-- Adds profiles.terms_accepted_at + terms_version and stamps them inside
-- handle_new_user(). Every new account passes through this trigger (email/
-- password AND OAuth), so consent is captured the moment the profile is created
-- and no backfill or separate write path is needed.
--
-- NO COLUMN GRANT IS ADDED (unlike 023 avatar_url / 025 theme_preference).
-- 006 replaced blanket UPDATE on profiles with a column allow-list, so any
-- column the APP writes from a user session needs its own GRANT. These two
-- columns are written ONLY by handle_new_user(), which is SECURITY DEFINER and
-- runs as its owning role — it bypasses the allow-list. Granting UPDATE would
-- only let a user rewrite their own consent timestamp, which least privilege
-- says not to do. If a re-consent flow is ever built that writes these from the
-- client (e.g. on a Terms version bump), add the GRANT then.
--
-- Supersedes the handle_new_user() body from 004_signup_city.sql. Safe to
-- re-apply: ADD COLUMN IF NOT EXISTS is idempotent and CREATE OR REPLACE keeps
-- the existing trigger binding from 001 (no DROP/CREATE TRIGGER needed).
--
-- Run via Supabase SQL Editor, or:
--   npx supabase db push
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, full_name, city, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'city',
    now(),
    '1.0'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
