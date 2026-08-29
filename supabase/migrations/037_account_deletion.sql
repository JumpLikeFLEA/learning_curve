-- ============================================================
-- 037_account_deletion.sql
--
-- Right to erasure (GDPR Art. 17) by ANONYMISATION, not row deletion. Full
-- rationale in docs/adr/0002-account-erasure.md. Six FKs to profiles have no
-- ON DELETE action, so a hard delete of the auth user fails; and groups.owner_id
-- ON DELETE CASCADE would chain through questions/quizzes.group_id into results
-- and destroy OTHER members' history. So we erase the person and keep the
-- record, unattributable.
--
-- Adds:
--   • profiles.deleted_at
--   • delete_my_account() — SECURITY DEFINER, returns JSONB. Blocks (makes no
--     change) if the caller owns a group that still has other members; otherwise
--     anonymises the profile, deletes solo-owned groups and transient data, and
--     opts out of leaderboards. The auth-user BAN and avatar-object removal are
--     done by the route handler with the service role — not here.
--   • deleted_at IS NULL guard on the three leaderboard RPCs (belt-and-braces on
--     top of the opt-out the function sets: opt_out is user-toggleable,
--     deleted_at is permanent).
--
-- No column GRANT for deleted_at (same reasoning as 036): it is written only by
-- this SECURITY DEFINER function, never from a user session.
--
-- Safe to re-apply: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE throughout
-- (the leaderboard functions keep their 031 signatures, so REPLACE is legal and
-- their existing grants persist; the GRANT/REVOKE lines are repeated for clarity
-- and are idempotent).
--
-- Run via Supabase SQL Editor, or:
--   npx supabase db push
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ── delete_my_account ───────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me       UUID := auth.uid();
  v_blocking JSONB;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  -- Block if the caller owns any group that still has OTHER members. Deleting
  -- such a group would take the members' content with it (owner_id cascade), and
  -- Art. 17 is a right over one's own data, not everyone else's. The caller must
  -- transfer ownership or remove the members first. Solo-owned groups fall
  -- through and are deleted below.
  SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name))
    INTO v_blocking
  FROM groups g
  WHERE g.owner_id = v_me
    AND EXISTS (
      SELECT 1 FROM group_members m
      WHERE m.group_id = g.id AND m.user_id <> v_me
    );

  IF v_blocking IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'owns_groups', 'groups', v_blocking);
  END IF;

  -- Solo-owned groups: delete them. Their questions/quizzes cascade (014), and
  -- since no other member exists, the content is entirely the caller's own. Done
  -- while owner_id still points at the caller.
  DELETE FROM groups g
  WHERE g.owner_id = v_me
    AND NOT EXISTS (
      SELECT 1 FROM group_members m
      WHERE m.group_id = g.id AND m.user_id <> v_me
    );

  -- Leave every group the caller merely belongs to.
  DELETE FROM group_members WHERE user_id = v_me;

  -- Purge transient / notification data (these FKs cascade on a profile delete,
  -- but we are not deleting the profile row, so remove them explicitly).
  DELETE FROM notifications            WHERE user_id = v_me;
  DELETE FROM notification_preferences WHERE user_id = v_me;
  DELETE FROM quiz_sessions            WHERE user_id = v_me;

  -- Anonymise the profile. results, authored questions/quizzes and remaining
  -- group content stay in place, now attributable to nobody. leaderboard_opt_out
  -- + deleted_at both remove the account from every board.
  UPDATE profiles
     SET full_name           = NULL,
         city                = NULL,
         display_name        = 'Deleted user',
         avatar_url          = NULL,
         leaderboard_opt_out = TRUE,
         deleted_at          = now()
   WHERE id = v_me;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION delete_my_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;


-- ── leaderboard RPCs: exclude anonymised accounts ───────────
-- Re-emitted from 031 verbatim with a single added predicate each
-- (deleted_at IS NULL). Signatures are unchanged, so CREATE OR REPLACE is legal
-- and the 031 grants persist.

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_scope    TEXT DEFAULT 'global',
  p_group_id UUID DEFAULT NULL,
  p_subject  TEXT DEFAULT NULL,
  p_window   TEXT DEFAULT 'all',
  p_limit    INT  DEFAULT 100,
  p_offset   INT  DEFAULT 0
)
RETURNS TABLE (
  rank         BIGINT,
  user_id      UUID,
  display_name TEXT,
  avatar_url   TEXT,
  xp           BIGINT,
  tier         TEXT,
  is_me        BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me    UUID := auth.uid();
  v_since TIMESTAMPTZ;
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  IF p_scope = 'group' AND (p_group_id IS NULL OR NOT is_group_member(p_group_id, v_me)) THEN
    RETURN;
  END IF;

  v_since := CASE p_window
               WHEN '7d'  THEN NOW() - INTERVAL '7 days'
               WHEN '30d' THEN NOW() - INTERVAL '30 days'
               ELSE NULL
             END;

  RETURN QUERY
  WITH totals AS (
    SELECT r.user_id AS uid, SUM(r.xp_awarded)::BIGINT AS total
    FROM results r
    JOIN profiles pr ON pr.id = r.user_id
    WHERE r.leaderboard_eligible
      AND NOT pr.leaderboard_opt_out
      AND pr.deleted_at IS NULL
      AND (v_since IS NULL OR r.taken_at >= v_since)
      AND (p_subject IS NULL OR r.subject = p_subject)
      AND (
        p_scope <> 'group'
        OR EXISTS (
          SELECT 1 FROM group_members m
          WHERE m.group_id = p_group_id AND m.user_id = r.user_id
        )
      )
    GROUP BY r.user_id
    HAVING SUM(r.xp_awarded) > 0
  )
  SELECT
    RANK() OVER (ORDER BY t.total DESC)::BIGINT,
    t.uid,
    pr.display_name,
    pr.avatar_url,
    t.total,
    CASE WHEN plr.user_id IS NULL THEN NULL
         ELSE NULLIF(tier_for(plr.rating, plr.matches_played), 'unranked') END,
    t.uid = v_me
  FROM totals t
  JOIN profiles pr ON pr.id = t.uid
  LEFT JOIN player_ratings plr ON plr.user_id = t.uid
  ORDER BY t.total DESC, pr.display_name
  LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION get_leaderboard(TEXT, UUID, TEXT, TEXT, INT, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, UUID, TEXT, TEXT, INT, INT) TO authenticated;


CREATE OR REPLACE FUNCTION get_my_rank(
  p_scope    TEXT DEFAULT 'global',
  p_group_id UUID DEFAULT NULL,
  p_subject  TEXT DEFAULT NULL,
  p_window   TEXT DEFAULT 'all'
)
RETURNS TABLE (
  rank         BIGINT,
  user_id      UUID,
  display_name TEXT,
  avatar_url   TEXT,
  xp           BIGINT,
  tier         TEXT,
  total_ranked BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me    UUID := auth.uid();
  v_since TIMESTAMPTZ;
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  IF p_scope = 'group' AND (p_group_id IS NULL OR NOT is_group_member(p_group_id, v_me)) THEN
    RETURN;
  END IF;

  v_since := CASE p_window
               WHEN '7d'  THEN NOW() - INTERVAL '7 days'
               WHEN '30d' THEN NOW() - INTERVAL '30 days'
               ELSE NULL
             END;

  RETURN QUERY
  WITH totals AS (
    SELECT r.user_id AS uid, SUM(r.xp_awarded)::BIGINT AS total
    FROM results r
    JOIN profiles pr ON pr.id = r.user_id
    WHERE r.leaderboard_eligible
      AND NOT pr.leaderboard_opt_out
      AND pr.deleted_at IS NULL
      AND (v_since IS NULL OR r.taken_at >= v_since)
      AND (p_subject IS NULL OR r.subject = p_subject)
      AND (
        p_scope <> 'group'
        OR EXISTS (
          SELECT 1 FROM group_members m
          WHERE m.group_id = p_group_id AND m.user_id = r.user_id
        )
      )
    GROUP BY r.user_id
    HAVING SUM(r.xp_awarded) > 0
  ),
  ranked AS (
    SELECT
      RANK() OVER (ORDER BY t.total DESC)::BIGINT AS rnk,
      COUNT(*) OVER ()::BIGINT                    AS field_size,
      t.uid,
      t.total
    FROM totals t
  )
  SELECT rk.rnk, rk.uid, pr.display_name, pr.avatar_url, rk.total, NULL::TEXT, rk.field_size
  FROM ranked rk
  JOIN profiles pr ON pr.id = rk.uid
  WHERE rk.uid = v_me;
END;
$$;

REVOKE ALL ON FUNCTION get_my_rank(TEXT, UUID, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_my_rank(TEXT, UUID, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION get_competitive_leaderboard(
  p_scope    TEXT DEFAULT 'global',
  p_group_id UUID DEFAULT NULL,
  p_limit    INT  DEFAULT 100,
  p_offset   INT  DEFAULT 0
)
RETURNS TABLE (
  rank           BIGINT,
  user_id        UUID,
  display_name   TEXT,
  avatar_url     TEXT,
  tier           TEXT,
  matches_played INT,
  is_me          BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;
  IF p_scope = 'group' AND (p_group_id IS NULL OR NOT is_group_member(p_group_id, v_me)) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY pr.rating DESC)::BIGINT,
    pr.user_id,
    p.display_name,
    p.avatar_url,
    tier_for(pr.rating, pr.matches_played),
    pr.matches_played,
    pr.user_id = v_me
  FROM player_ratings pr
  JOIN profiles p ON p.id = pr.user_id
  WHERE pr.matches_played >= 5
    AND NOT p.leaderboard_opt_out
    AND p.deleted_at IS NULL
    AND (
      p_scope <> 'group'
      OR EXISTS (
        SELECT 1 FROM group_members m
        WHERE m.group_id = p_group_id AND m.user_id = pr.user_id
      )
    )
  ORDER BY pr.rating DESC, p.display_name
  LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION get_competitive_leaderboard(TEXT, UUID, INT, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_competitive_leaderboard(TEXT, UUID, INT, INT) TO authenticated;
