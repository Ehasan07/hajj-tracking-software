-- Stock movements, sale lines, customer payments and salary advances are
-- append-only for the app role. A mistake is fixed with a new row.
REVOKE UPDATE, DELETE, TRUNCATE ON "stock_movements" FROM "hajj_app";--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "sale_items" FROM "hajj_app";--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "customer_payments" FROM "hajj_app";--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "employee_advances" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "sales" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "expenses" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "salary_sheets" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "products" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "customers" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "routes" FROM "hajj_app";--> statement-breakpoint
REVOKE DELETE, TRUNCATE ON "employees" FROM "hajj_app";--> statement-breakpoint

-- A sale's money never changes after it is written; the only allowed change is voiding it once.
CREATE OR REPLACE FUNCTION sales_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.discount IS DISTINCT FROM OLD.discount
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.paid IS DISTINCT FROM OLD.paid
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.unit IS DISTINCT FROM OLD.unit
     OR NEW.ref IS DISTINCT FROM OLD.ref
     OR NEW.sold_at IS DISTINCT FROM OLD.sold_at
     OR NEW.business_date IS DISTINCT FROM OLD.business_date
     OR NEW.ledger_entry_id IS DISTINCT FROM OLD.ledger_entry_id THEN
    RAISE EXCEPTION 'SALE_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'ALREADY_VOID' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER sales_guard BEFORE UPDATE ON "sales"
  FOR EACH ROW EXECUTE FUNCTION sales_guard();--> statement-breakpoint

CREATE OR REPLACE FUNCTION expenses_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.unit IS DISTINCT FROM OLD.unit
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.business_date IS DISTINCT FROM OLD.business_date
     OR NEW.ledger_entry_id IS DISTINCT FROM OLD.ledger_entry_id THEN
    RAISE EXCEPTION 'EXPENSE_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_VOID' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER expenses_guard BEFORE UPDATE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION expenses_guard();--> statement-breakpoint

-- Salary lines change only while their sheet is a draft. A delete cascading
-- from a removed agency (fired from inside the foreign key trigger) passes.
CREATE OR REPLACE FUNCTION salary_lines_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  st salary_sheet_status;
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  SELECT status INTO st FROM salary_sheets WHERE id = coalesce(NEW.sheet_id, OLD.sheet_id);
  IF st IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'SHEET_LOCKED' USING ERRCODE = 'check_violation';
  END IF;
  RETURN coalesce(NEW, OLD);
END
$$;--> statement-breakpoint
CREATE TRIGGER salary_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON "salary_lines"
  FOR EACH ROW EXECUTE FUNCTION salary_lines_guard();--> statement-breakpoint

-- A paid sheet is final.
CREATE OR REPLACE FUNCTION salary_sheets_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'SHEET_PAID' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER salary_sheets_guard BEFORE UPDATE ON "salary_sheets"
  FOR EACH ROW EXECUTE FUNCTION salary_sheets_guard();--> statement-breakpoint

CREATE TRIGGER products_audit AFTER INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER product_batches_audit AFTER INSERT OR UPDATE OR DELETE ON "product_batches"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER customers_audit AFTER INSERT OR UPDATE ON "customers"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER routes_audit AFTER INSERT OR UPDATE ON "routes"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER sales_audit AFTER INSERT OR UPDATE ON "sales"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER customer_payments_audit AFTER INSERT ON "customer_payments"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER expenses_audit AFTER INSERT OR UPDATE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER employees_audit AFTER INSERT OR UPDATE ON "employees"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER employee_advances_audit AFTER INSERT ON "employee_advances"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER salary_sheets_audit AFTER INSERT OR UPDATE ON "salary_sheets"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER salary_lines_audit AFTER INSERT OR UPDATE OR DELETE ON "salary_lines"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER hotels_audit AFTER INSERT OR UPDATE OR DELETE ON "hotels"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER hotel_bookings_audit AFTER INSERT OR UPDATE OR DELETE ON "hotel_bookings"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER room_assignments_audit AFTER INSERT OR UPDATE OR DELETE ON "room_assignments"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint
CREATE TRIGGER member_units_audit AFTER INSERT OR UPDATE OR DELETE ON "member_units"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
