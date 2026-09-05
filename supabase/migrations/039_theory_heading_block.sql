-- 039_theory_heading_block.sql
--
-- Adds the 'heading' theory block discriminator to save_stage_theory()'s
-- fail-closed structural backstop. The real content bar (zod + KaTeX compile)
-- lives in lib/theoryValidate.ts and runs in the API route BEFORE this RPC; this
-- array is only the direct-RPC-caller guard, and without 'heading' in it the
-- in-app editor's save of a stage containing a heading block would fail with
-- 'invalid_blocks'.
--
-- CREATE OR REPLACE of the function from 029 — body is byte-identical except the
-- discriminator array on line marked below. No signature change, so the 029
-- REVOKE/GRANT still stand and are not repeated.

CREATE OR REPLACE FUNCTION save_stage_theory(
  p_stage_id        UUID,
  p_blocks          JSONB,
  p_base_updated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me        UUID := (SELECT auth.uid());
  v_course    UUID;
  v_cur       TIMESTAMPTZ;
  v_cur_blocks JSONB;
  v_exists    BOOLEAN;
  v_next_ver  INT;
  v_new_ts    TIMESTAMPTZ := NOW();
BEGIN
  SELECT course_id INTO v_course FROM course_stages WHERE id = p_stage_id;
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'stage_not_found');
  END IF;
  IF NOT can_edit_course(v_course, v_me) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Structural backstop: an array of blocks with known discriminators.
  IF jsonb_typeof(p_blocks) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_blocks');
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_blocks) e
    WHERE COALESCE(e->>'type', '') <> ALL (ARRAY['prose','heading','formula','example','callout','list','definition'])
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_blocks');
  END IF;

  -- Lock the row (or its absence) and read current state for the concurrency check.
  SELECT updated_at, blocks INTO v_cur, v_cur_blocks
  FROM course_stage_theory WHERE stage_id = p_stage_id FOR UPDATE;
  v_exists := FOUND;

  -- Optimistic concurrency. A fresh stage (no row) requires a NULL base token.
  IF v_exists THEN
    IF p_base_updated_at IS DISTINCT FROM v_cur THEN
      RETURN jsonb_build_object('ok', false, 'error', 'stale');
    END IF;
  ELSE
    IF p_base_updated_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'stale');
    END IF;
  END IF;

  -- Snapshot the blocks being replaced (only if a row existed).
  IF v_exists THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_ver
    FROM course_stage_theory_versions WHERE stage_id = p_stage_id;
    INSERT INTO course_stage_theory_versions (stage_id, version, blocks, edited_by, edited_at)
    VALUES (p_stage_id, v_next_ver, v_cur_blocks, v_me, v_new_ts);
  END IF;

  INSERT INTO course_stage_theory (stage_id, blocks, updated_at, updated_by)
  VALUES (p_stage_id, p_blocks, v_new_ts, v_me)
  ON CONFLICT (stage_id) DO UPDATE
  SET blocks = EXCLUDED.blocks, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

  RETURN jsonb_build_object('ok', true, 'updated_at', v_new_ts);
END;
$$;
