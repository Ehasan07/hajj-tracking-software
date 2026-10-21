-- Personal data: what the audit trail keeps, and how a person's details are
-- erased on request. The app role still can't edit the audit trail, the
-- ledger or sent SMS; these functions do only the erasing, only inside the
-- caller's own agency (app.tenant_id), and only for the tables named.

-- The audit trail records what changed, but never encrypted ID numbers or
-- their search indexes: they add nothing a reader of the trail can use.
CREATE OR REPLACE FUNCTION audit_clean(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN j IS NULL THEN NULL ELSE
    coalesce((SELECT jsonb_object_agg(key, value) FROM jsonb_each(j) WHERE key !~ '(_enc|_index)$'), '{}'::jsonb)
  END
$$;--> statement-breakpoint

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
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN audit_clean(to_jsonb(OLD)) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN audit_clean(to_jsonb(NEW)) END
  );
  RETURN NULL;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION audit_row_change() FROM PUBLIC;--> statement-breakpoint

-- The same for what is already in the trail.
UPDATE audit_log SET before = audit_clean(before), after = audit_clean(after)
 WHERE EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(before, '{}'::jsonb)) k WHERE k ~ '(_enc|_index)$')
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(after, '{}'::jsonb)) k WHERE k ~ '(_enc|_index)$');--> statement-breakpoint

-- Erasing a person: the trail keeps that a row was added or changed, when and
-- by whom, but no longer what it said.
CREATE OR REPLACE FUNCTION erase_audit(p_table text, p_row_ids text[]) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_table NOT IN ('pilgrims', 'pilgrim_documents', 'inquiries', 'customers', 'employees') THEN
    RAISE EXCEPTION 'NOT_ERASABLE' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE audit_log SET before = NULL, after = NULL
   WHERE tenant_id = current_setting('app.tenant_id') AND table_name = p_table AND row_id = ANY (p_row_ids);
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION erase_audit(text, text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION erase_audit(text, text[]) TO "hajj_app";--> statement-breakpoint

-- Text messages to an erased person's numbers: the number and text go, the
-- count (what the plan's allowance used) stays. Anything still queued is not sent.
CREATE OR REPLACE FUNCTION erase_sms(p_phones text[]) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sms_messages
     SET to_phone = '', body = '[erased]', status = CASE WHEN status = 'queued' THEN 'skipped' ELSE status END
   WHERE tenant_id = current_setting('app.tenant_id') AND to_phone = ANY (p_phones);
  UPDATE audit_log SET before = NULL, after = NULL
   WHERE tenant_id = current_setting('app.tenant_id') AND table_name = 'sms_messages' AND after->>'to_phone' = ANY (p_phones);
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION erase_sms(text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION erase_sms(text[]) TO "hajj_app";--> statement-breakpoint

-- Ledger notes that carry an erased customer's or employee's name (a payment
-- collected, a salary paid) keep the amount and date; the name becomes a dash.
CREATE OR REPLACE FUNCTION erase_ledger_memos(p_source_type text, p_source_ids text[], p_name text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  touched text[];
BEGIN
  IF p_source_type NOT IN ('pos_sale', 'customer_payment', 'salary', 'salary_advance') OR coalesce(p_name, '') = '' THEN
    RAISE EXCEPTION 'NOT_ERASABLE' USING ERRCODE = 'insufficient_privilege';
  END IF;
  WITH changed AS (
    UPDATE ledger_entries SET memo = replace(memo, p_name, '—')
     WHERE tenant_id = current_setting('app.tenant_id') AND source_type = p_source_type
       AND source_id = ANY (p_source_ids) AND strpos(memo, p_name) > 0
    RETURNING id::text
  )
  SELECT array_agg(id) INTO touched FROM changed;
  UPDATE audit_log SET after = jsonb_set(after, '{memo}', to_jsonb(replace(after->>'memo', p_name, '—')))
   WHERE tenant_id = current_setting('app.tenant_id') AND table_name = 'ledger_entries'
     AND row_id = ANY (coalesce(touched, '{}')) AND after ? 'memo';
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION erase_ledger_memos(text, text[], text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION erase_ledger_memos(text, text[], text) TO "hajj_app";--> statement-breakpoint

-- Every stored file something still points at, across agencies, for the job
-- that removes files nothing uses any more. Keys only, never contents.
CREATE OR REPLACE FUNCTION referenced_file_keys() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT file_key FROM pilgrim_documents
  UNION SELECT passport_scan_key FROM pilgrims WHERE passport_scan_key IS NOT NULL
  UNION SELECT image_key FROM travel_packages WHERE image_key IS NOT NULL
  UNION SELECT logo_key FROM website_settings WHERE logo_key IS NOT NULL
  UNION SELECT hero_key FROM website_settings WHERE hero_key IS NOT NULL
  UNION SELECT cover_key FROM site_posts WHERE cover_key IS NOT NULL
  UNION SELECT image_key FROM site_gallery
  UNION SELECT branding->>'logoKey' FROM tenant_settings WHERE branding ? 'logoKey'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION referenced_file_keys() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION referenced_file_keys() TO "hajj_app";--> statement-breakpoint

-- Whether a login is a platform admin, so removing it from an agency never erases it.
CREATE OR REPLACE FUNCTION user_is_platform_admin(p_user_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_user_id)
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION user_is_platform_admin(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION user_is_platform_admin(text) TO "hajj_app";
