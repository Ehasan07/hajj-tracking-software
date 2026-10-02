-- Which agency a public website request belongs to: by host name first, then
-- by organization slug (used for the root site and local development).
-- Returns only the tenant id; all further reads run under that tenant's RLS.
CREATE OR REPLACE FUNCTION resolve_public_tenant(p_host text, p_slug text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT tenant_id FROM tenant_settings WHERE public_host = lower(p_host) LIMIT 1),
    (SELECT s.tenant_id FROM organization o JOIN tenant_settings s ON s.tenant_id = o.id WHERE o.slug = p_slug LIMIT 1)
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION resolve_public_tenant(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION resolve_public_tenant(text, text) TO "hajj_app";
