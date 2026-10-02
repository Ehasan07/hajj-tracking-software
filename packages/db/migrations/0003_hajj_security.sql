-- Payments are never deleted, and their money fields never change after insert.
REVOKE DELETE, TRUNCATE ON "payments" FROM "hajj_app";--> statement-breakpoint

CREATE OR REPLACE FUNCTION payments_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.pilgrim_id IS DISTINCT FROM OLD.pilgrim_id
     OR NEW.receipt_no IS DISTINCT FROM OLD.receipt_no
     OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.business_date IS DISTINCT FROM OLD.business_date
     OR NEW.ledger_entry_id IS DISTINCT FROM OLD.ledger_entry_id
     OR NEW.verify_token IS DISTINCT FROM OLD.verify_token
     OR NEW.method IS DISTINCT FROM OLD.method THEN
    RAISE EXCEPTION 'PAYMENT_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_VOID' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER payments_guard BEFORE UPDATE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION payments_guard();--> statement-breakpoint

CREATE TRIGGER travel_packages_audit AFTER INSERT OR UPDATE OR DELETE ON "travel_packages"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER inquiries_audit AFTER INSERT OR UPDATE OR DELETE ON "inquiries"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER pilgrims_audit AFTER INSERT OR UPDATE OR DELETE ON "pilgrims"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER payments_audit AFTER INSERT OR UPDATE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER articles_audit AFTER INSERT OR UPDATE OR DELETE ON "articles"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint

-- Public receipt check behind the QR code. Reveals only what is printed on the
-- receipt itself, and only to someone holding the unguessable token.
CREATE OR REPLACE FUNCTION verify_receipt(p_token text)
RETURNS TABLE (
  receipt_no text,
  amount bigint,
  currency currency,
  received_at timestamptz,
  voided boolean,
  agency text,
  pilgrim_ref text,
  pilgrim_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.receipt_no, p.amount, p.currency, p.received_at, p.voided_at IS NOT NULL,
         s.legal_name, g.ref, split_part(g.full_name, ' ', 1) || ' …'
  FROM payments p
  JOIN pilgrims g ON g.id = p.pilgrim_id
  JOIN tenant_settings s ON s.tenant_id = p.tenant_id
  WHERE p.verify_token = p_token AND length(p_token) >= 20
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION verify_receipt(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION verify_receipt(text) TO "hajj_app";
