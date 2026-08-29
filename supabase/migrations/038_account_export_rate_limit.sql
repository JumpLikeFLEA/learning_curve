-- ============================================================
-- 038_account_export_rate_limit.sql
--
-- Rate-limits GET /api/account/export. The export streams the caller's whole
-- profile, every result, achievements, memberships and duel history in one
-- synchronous response (see the route header) — cheap per call, but not
-- something one account should be able to pull dozens of times an hour.
--
-- SAME SHAPE AS THE FEEDBACK LIMIT (026), for the same reasons:
--   • The count lives in a BEFORE INSERT trigger, SECURITY DEFINER, so it sees
--     rows the caller's RLS-filtered session cannot — and so the cap holds on
--     EVERY insert path, including a caller who posts straight to PostgREST.
--   • PT429 is PostgREST's status-override convention: the client sees a real
--     429 AND error.code === 'PT429', matched on the code, never the message.
--
-- Unlike feedback, an export writes no domain row of its own, so there is a
-- dedicated log table whose only job is to be counted. Rows are timestamps with
-- a user id — no export contents are stored here.
--
-- Safe to re-apply: every operation is idempotent.
--
-- Run via Supabase SQL Editor, or:  npx supabase db push
-- ============================================================


-- ── account_export_log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_export_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE CASCADE for consistency with the feedback table: this is the
  -- user's own activity trail and leaves with them. (The 1.0 erasure path
  -- anonymises rather than deletes the profile, so this rarely fires — but the
  -- FK still states the intent.)
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The one query that runs on every export: recent rows for this user.
CREATE INDEX IF NOT EXISTS account_export_user_recent_idx
  ON account_export_log (user_id, created_at DESC);

ALTER TABLE account_export_log ENABLE ROW LEVEL SECURITY;

-- Start from nothing (Supabase grants authenticated privileges on new tables by
-- default) and hand back only INSERT — nobody reads this table from a user
-- session. No SELECT grant and no SELECT policy, so the insert must NOT ask for
-- the row back (the route relies on this, same as feedback).
REVOKE ALL ON TABLE account_export_log FROM anon, authenticated;
GRANT INSERT ON TABLE account_export_log TO authenticated;

DROP POLICY IF EXISTS "account_export_log: author insert" ON account_export_log;
CREATE POLICY "account_export_log: author insert"
  ON account_export_log FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- ── rate limit ──────────────────────────────────────────────
-- Exports per user per rolling hour. Rolling, not calendar (a calendar window
-- lets the budget be spent twice across a boundary). Five is generous for a
-- human downloading their own data and cheap to enforce.
CREATE OR REPLACE FUNCTION account_export_hourly_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 5 $$;

REVOKE ALL ON FUNCTION account_export_hourly_limit() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION account_export_enforce_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INTEGER;
  v_limit  INTEGER := account_export_hourly_limit();
BEGIN
  SELECT count(*) INTO v_recent
  FROM account_export_log
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent >= v_limit THEN
    RAISE EXCEPTION 'account export rate limit reached (% per hour)', v_limit
      USING ERRCODE = 'PT429';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_export_rate_limit ON account_export_log;
CREATE TRIGGER account_export_rate_limit
  BEFORE INSERT ON account_export_log
  FOR EACH ROW
  EXECUTE FUNCTION account_export_enforce_rate_limit();


-- ── account_export_quota: the caller's own remaining budget ──
-- Called only on the error path, to turn "you hit the limit" into "try again in
-- N minutes". SECURITY DEFINER (the caller cannot read the table) and returns
-- only aggregates over the caller's OWN rows.
CREATE OR REPLACE FUNCTION account_export_quota()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID    := auth.uid();
  v_limit  INTEGER := account_export_hourly_limit();
  v_used   INTEGER;
  v_oldest TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SELECT count(*), min(created_at) INTO v_used, v_oldest
  FROM account_export_log
  WHERE user_id = v_user
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN jsonb_build_object(
    'ok',        true,
    'limit',     v_limit,
    'used',      v_used,
    'remaining', GREATEST(v_limit - v_used, 0),
    'resets_at', CASE WHEN v_oldest IS NULL THEN NULL
                      ELSE v_oldest + INTERVAL '1 hour' END
  );
END;
$$;

REVOKE ALL ON FUNCTION account_export_quota() FROM public, anon;
GRANT EXECUTE ON FUNCTION account_export_quota() TO authenticated;
