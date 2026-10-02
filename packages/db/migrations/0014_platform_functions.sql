-- The app role may read plans (for the pricing page) but not change them,
-- and may not see who the platform admins are at all.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "plans" FROM "hajj_app";--> statement-breakpoint
REVOKE ALL ON "platform_admins" FROM "hajj_app";--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "subscriptions" FROM "hajj_app";--> statement-breakpoint
CREATE TRIGGER subscriptions_audit AFTER INSERT OR UPDATE OR DELETE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint

CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = nullif(current_setting('app.user_id', true), ''))
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_platform_admin() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'insufficient_privilege';
  END IF;
END
$$;--> statement-breakpoint

-- Called once by onboarding, inside the new agency's tenant context.
CREATE OR REPLACE FUNCTION start_trial(p_plan_code text, p_days int) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at)
  SELECT current_setting('app.tenant_id'), p.id, 'trial', now() + make_interval(days => greatest(p_days, 0))
  FROM plans p WHERE p.code = p_plan_code
  ON CONFLICT (tenant_id) DO NOTHING
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION platform_overview() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  PERFORM assert_platform_admin();
  SELECT json_build_object(
    'agencies', (SELECT count(*) FROM tenant_settings),
    'byStatus', (SELECT coalesce(json_object_agg(status, n), '{}'::json) FROM (
        SELECT coalesce(s.status::text, 'none') AS status, count(*) AS n
        FROM tenant_settings t LEFT JOIN subscriptions s ON s.tenant_id = t.tenant_id GROUP BY 1) x),
    'trialsEndingSoon', (SELECT count(*) FROM subscriptions WHERE status = 'trial' AND trial_ends_at BETWEEN now() AND now() + interval '7 days'),
    'trialsExpired', (SELECT count(*) FROM subscriptions WHERE status = 'trial' AND trial_ends_at < now()),
    'mrr', (SELECT coalesce(sum(CASE s.cycle WHEN 'monthly' THEN p.price_monthly ELSE p.price_yearly / 12 END), 0)
            FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active'),
    'collectionsThisMonth', (SELECT coalesce(sum(CASE direction WHEN 'in' THEN amount ELSE -amount END), 0)
            FROM ledger_entries WHERE currency = 'BDT' AND business_date >= date_trunc('month', now())::date),
    'pilgrims', (SELECT count(*) FROM pilgrims),
    'pilgrimsThisYear', (SELECT count(*) FROM pilgrims WHERE created_at >= date_trunc('year', now())),
    'newAgencies30d', (SELECT count(*) FROM tenant_settings WHERE created_at >= now() - interval '30 days'),
    'signupsByMonth', (SELECT coalesce(json_agg(json_build_object('month', m, 'n', n) ORDER BY m), '[]'::json) FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m, count(*) AS n
        FROM tenant_settings WHERE created_at >= date_trunc('month', now()) - interval '5 months' GROUP BY 1) y)
  ) INTO result;
  RETURN result;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION platform_agencies() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  PERFORM assert_platform_admin();
  SELECT coalesce(json_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::json) INTO result FROM (
    SELECT t.tenant_id AS id, t.legal_name AS name, o.slug, t.created_at, t.public_host,
           t.enabled_units,
           (SELECT json_build_object('name', u.name, 'email', u.email) FROM member m JOIN "user" u ON u.id = m.user_id
             WHERE m.organization_id = t.tenant_id AND m.role = 'owner' ORDER BY m.created_at LIMIT 1) AS owner,
           p.code AS plan_code, p.name_bn AS plan_name_bn, p.name_en AS plan_name_en,
           s.status, s.cycle, s.trial_ends_at, s.current_period_end,
           (SELECT count(*) FROM pilgrims g WHERE g.tenant_id = t.tenant_id) AS pilgrims,
           (SELECT count(*) FROM member m WHERE m.organization_id = t.tenant_id) AS staff,
           (SELECT coalesce(sum(CASE direction WHEN 'in' THEN amount ELSE -amount END), 0) FROM ledger_entries l
             WHERE l.tenant_id = t.tenant_id AND l.currency = 'BDT' AND l.business_date >= date_trunc('month', now())::date) AS collections_this_month,
           (SELECT max(at) FROM audit_log al WHERE al.tenant_id = t.tenant_id) AS last_activity
    FROM tenant_settings t
    JOIN organization o ON o.id = t.tenant_id
    LEFT JOIN subscriptions s ON s.tenant_id = t.tenant_id
    LEFT JOIN plans p ON p.id = s.plan_id
  ) a;
  RETURN result;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION platform_set_subscription(
  p_tenant text, p_plan uuid, p_status subscription_status, p_cycle billing_cycle,
  p_trial_ends timestamptz, p_period_end timestamptz, p_notes text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_platform_admin();
  INSERT INTO subscriptions (tenant_id, plan_id, status, cycle, trial_ends_at, current_period_end, notes, updated_at)
  VALUES (p_tenant, p_plan, p_status, p_cycle, p_trial_ends, p_period_end, p_notes, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    plan_id = excluded.plan_id, status = excluded.status, cycle = excluded.cycle,
    trial_ends_at = excluded.trial_ends_at, current_period_end = excluded.current_period_end,
    notes = excluded.notes, updated_at = now();
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION platform_set_units(p_tenant text, p_units business_unit[]) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_platform_admin();
  UPDATE tenant_settings SET enabled_units = p_units, updated_at = now() WHERE tenant_id = p_tenant;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION platform_save_plan(
  p_id uuid, p_code text, p_name_bn text, p_name_en text, p_tagline_bn text, p_tagline_en text,
  p_price_monthly bigint, p_price_yearly bigint, p_limits jsonb, p_units business_unit[],
  p_custom_domain boolean, p_sort int, p_active boolean
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE saved uuid;
BEGIN
  PERFORM assert_platform_admin();
  INSERT INTO plans (id, code, name_bn, name_en, tagline_bn, tagline_en, price_monthly, price_yearly, limits, units, custom_domain, sort_order, active)
  VALUES (coalesce(p_id, gen_random_uuid()), p_code, p_name_bn, p_name_en, p_tagline_bn, p_tagline_en, p_price_monthly, p_price_yearly, p_limits, p_units, p_custom_domain, p_sort, p_active)
  ON CONFLICT (id) DO UPDATE SET
    code = excluded.code, name_bn = excluded.name_bn, name_en = excluded.name_en,
    tagline_bn = excluded.tagline_bn, tagline_en = excluded.tagline_en,
    price_monthly = excluded.price_monthly, price_yearly = excluded.price_yearly, limits = excluded.limits,
    units = excluded.units, custom_domain = excluded.custom_domain, sort_order = excluded.sort_order,
    active = excluded.active, updated_at = now()
  RETURNING id INTO saved;
  INSERT INTO audit_log (tenant_id, actor_id, table_name, row_id, action, after)
  VALUES ('platform', nullif(current_setting('app.user_id', true), ''), 'plans', saved::text, 'SAVE',
          (SELECT to_jsonb(p) FROM plans p WHERE p.id = saved));
  RETURN saved;
END
$$;--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'is_platform_admin()', 'assert_platform_admin()', 'start_trial(text, int)', 'platform_overview()', 'platform_agencies()',
    'platform_set_subscription(text, uuid, subscription_status, billing_cycle, timestamptz, timestamptz, text)',
    'platform_set_units(text, business_unit[])',
    'platform_save_plan(uuid, text, text, text, text, text, bigint, bigint, jsonb, business_unit[], boolean, int, boolean)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO hajj_app', f);
  END LOOP;
END
$$;--> statement-breakpoint

-- Starting catalogue; prices are placeholders for the platform owner to set.
INSERT INTO plans (code, name_bn, name_en, tagline_bn, tagline_en, price_monthly, price_yearly, limits, units, custom_domain, sort_order) VALUES
  ('basic', 'বেসিক', 'Basic', 'ছোট এজেন্সির হজ-ওমরার খাতা', 'Hajj and Umrah books for a small agency',
   250000, 2500000, '{"pilgrimsPerYear": 150, "staffSeats": 3, "smsPerMonth": 500}', '{hajj,office}', false, 10),
  ('standard', 'স্ট্যান্ডার্ড', 'Standard', 'বড় এজেন্সি, সাথে দুটি ব্যবসা', 'A growing agency with two side businesses',
   500000, 5000000, '{"pilgrimsPerYear": 600, "staffSeats": 10, "smsPerMonth": 2000}', '{hajj,office,zamzam,medicine}', false, 20),
  ('premium', 'প্রিমিয়াম', 'Premium', 'সব ব্যবসা, নিজের ডোমেইন, সীমাহীন হাজী', 'Every business, your own domain, unlimited pilgrims',
   950000, 9500000, '{"pilgrimsPerYear": null, "staffSeats": 30, "smsPerMonth": 6000}', '{hajj,office,zamzam,medicine,coffee,supernova}', true, 30)
ON CONFLICT (code) DO NOTHING;--> statement-breakpoint

-- Agencies that existed before plans start on a trial of the basic plan.
INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at)
SELECT t.tenant_id, (SELECT id FROM plans WHERE code = 'basic'), 'trial', now() + interval '30 days'
FROM tenant_settings t
ON CONFLICT (tenant_id) DO NOTHING;
