-- Reads of sensitive data (e.g. revealing a passport number) go to the same
-- audit trail as writes. The app role cannot insert into audit_log directly.
CREATE OR REPLACE FUNCTION record_access(p_table text, p_row_id text, p_action text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO audit_log (tenant_id, actor_id, table_name, row_id, action)
  VALUES (current_setting('app.tenant_id'), nullif(current_setting('app.user_id', true), ''), p_table, p_row_id, p_action)
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION record_access(text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION record_access(text, text, text) TO "hajj_app";
