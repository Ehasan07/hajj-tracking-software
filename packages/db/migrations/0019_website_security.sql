-- Website content: every change is audited; nothing is truncated by the app.
REVOKE TRUNCATE ON "website_settings", "site_posts", "site_gallery", "site_reviews", "site_faqs" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE ON "website_settings" FROM "hajj_app";--> statement-breakpoint
CREATE TRIGGER website_settings_audit AFTER INSERT OR UPDATE ON "website_settings"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER site_posts_audit AFTER INSERT OR UPDATE OR DELETE ON "site_posts"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER site_gallery_audit AFTER INSERT OR UPDATE OR DELETE ON "site_gallery"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER site_reviews_audit AFTER INSERT OR UPDATE OR DELETE ON "site_reviews"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER site_faqs_audit AFTER INSERT OR UPDATE OR DELETE ON "site_faqs"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint

-- A website visitor (the "public-website" actor) may only send a review, and
-- it always arrives pending; everything else on these tables is the agency's.
CREATE OR REPLACE FUNCTION site_public_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('app.user_id', true), '') <> 'public-website' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_TABLE_NAME = 'site_reviews' AND TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.source := 'website';
    NEW.decided_at := NULL;
    NEW.decided_by := NULL;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'website visitors cannot change %', TG_TABLE_NAME USING ERRCODE = '42501';
END
$$;--> statement-breakpoint
CREATE TRIGGER website_settings_public_guard BEFORE INSERT OR UPDATE OR DELETE ON "website_settings"
  FOR EACH ROW EXECUTE FUNCTION site_public_guard();--> statement-breakpoint
CREATE TRIGGER site_posts_public_guard BEFORE INSERT OR UPDATE OR DELETE ON "site_posts"
  FOR EACH ROW EXECUTE FUNCTION site_public_guard();--> statement-breakpoint
CREATE TRIGGER site_gallery_public_guard BEFORE INSERT OR UPDATE OR DELETE ON "site_gallery"
  FOR EACH ROW EXECUTE FUNCTION site_public_guard();--> statement-breakpoint
CREATE TRIGGER site_reviews_public_guard BEFORE INSERT OR UPDATE OR DELETE ON "site_reviews"
  FOR EACH ROW EXECUTE FUNCTION site_public_guard();--> statement-breakpoint
CREATE TRIGGER site_faqs_public_guard BEFORE INSERT OR UPDATE OR DELETE ON "site_faqs"
  FOR EACH ROW EXECUTE FUNCTION site_public_guard();--> statement-breakpoint

-- Whether a stored website image is still in use. The image route serves a
-- file only while this is true, so removing a photo takes it off the web.
CREATE OR REPLACE FUNCTION site_media_visible(p_tenant text, p_key text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM website_settings WHERE tenant_id = p_tenant AND p_key IN (logo_key, hero_key))
      OR EXISTS (SELECT 1 FROM site_gallery WHERE tenant_id = p_tenant AND image_key = p_key)
      OR EXISTS (SELECT 1 FROM site_posts WHERE tenant_id = p_tenant AND cover_key = p_key)
      OR EXISTS (SELECT 1 FROM travel_packages WHERE tenant_id = p_tenant AND image_key = p_key)
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION site_media_visible(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION site_media_visible(text, text) TO "hajj_app";--> statement-breakpoint

-- The website address an agency is reached by (its organization slug).
CREATE OR REPLACE FUNCTION public_site_slug(p_tenant text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug FROM organization WHERE id = p_tenant
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public_site_slug(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public_site_slug(text) TO "hajj_app";
