-- Ledger and audit trail are append-only for the application role.
REVOKE UPDATE, DELETE, TRUNCATE ON "ledger_entries" FROM "hajj_app";--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "audit_log" FROM "hajj_app";--> statement-breakpoint

-- Next gap-free number for a reference kind. Fails loudly when no tenant is set.
CREATE OR REPLACE FUNCTION next_reference(p_kind text, p_year int) RETURNS int
LANGUAGE sql VOLATILE AS $$
  INSERT INTO counters (tenant_id, kind, year, value)
  VALUES (current_setting('app.tenant_id'), p_kind, p_year, 1)
  ON CONFLICT (tenant_id, kind, year) DO UPDATE SET value = counters.value + 1
  RETURNING value
$$;--> statement-breakpoint

-- Generic audit trigger. Runs as the table owner so it can write audit_log,
-- which the app role cannot touch directly.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO audit_log (tenant_id, actor_id, table_name, row_id, action, before, after)
  VALUES (
    rec->>'tenant_id',
    nullif(current_setting('app.user_id', true), ''),
    TG_TABLE_NAME,
    coalesce(rec->>'id', rec->>'tenant_id'),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION audit_row_change() FROM PUBLIC;--> statement-breakpoint

CREATE TRIGGER tenant_settings_audit AFTER INSERT OR UPDATE OR DELETE ON "tenant_settings"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER exchange_rates_audit AFTER INSERT OR UPDATE OR DELETE ON "exchange_rates"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER ledger_entries_audit AFTER INSERT ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
