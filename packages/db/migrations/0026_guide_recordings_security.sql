-- The guide's recordings: anyone may read the list (the public guide plays
-- them), only a platform admin changes it, through these functions.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "guide_recordings" FROM "hajj_app";--> statement-breakpoint
GRANT SELECT ON "guide_recordings" TO "hajj_app";--> statement-breakpoint

-- Save an item's recording; returns the storage key of the one it replaces, to delete.
CREATE OR REPLACE FUNCTION platform_set_recording(p_item text, p_reciter text, p_key text, p_type text, p_size int) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  previous text;
BEGIN
  PERFORM assert_platform_admin();
  SELECT file_key INTO previous FROM guide_recordings WHERE item_id = p_item;
  INSERT INTO guide_recordings (item_id, reciter, file_key, content_type, size_bytes, uploaded_by, uploaded_at)
  VALUES (p_item, p_reciter, p_key, p_type, p_size, current_setting('app.user_id'), now())
  ON CONFLICT (item_id) DO UPDATE
    SET reciter = EXCLUDED.reciter, file_key = EXCLUDED.file_key, content_type = EXCLUDED.content_type,
        size_bytes = EXCLUDED.size_bytes, uploaded_by = EXCLUDED.uploaded_by, uploaded_at = EXCLUDED.uploaded_at;
  RETURN CASE WHEN previous IS DISTINCT FROM p_key THEN previous END;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_set_recording(text, text, text, text, int) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_set_recording(text, text, text, text, int) TO "hajj_app";--> statement-breakpoint

-- Remove an item's recording; returns its storage key, to delete.
CREATE OR REPLACE FUNCTION platform_remove_recording(p_item text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  removed text;
BEGIN
  PERFORM assert_platform_admin();
  DELETE FROM guide_recordings WHERE item_id = p_item RETURNING file_key INTO removed;
  RETURN removed;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_remove_recording(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_remove_recording(text) TO "hajj_app";
