-- A pilgrim's papers are never deleted by the app (a wrong one is marked
-- rejected), except when the pilgrim's details are erased on request. This
-- removes them, only inside the caller's agency, and returns the stored files
-- to delete.
CREATE OR REPLACE FUNCTION erase_pilgrim_documents(p_pilgrim_id uuid) RETURNS TABLE (id uuid, file_key text)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM pilgrim_documents d
   WHERE d.tenant_id = current_setting('app.tenant_id') AND d.pilgrim_id = p_pilgrim_id
  RETURNING d.id, d.file_key
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION erase_pilgrim_documents(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION erase_pilgrim_documents(uuid) TO "hajj_app";
