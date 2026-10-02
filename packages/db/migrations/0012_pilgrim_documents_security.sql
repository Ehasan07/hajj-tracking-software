REVOKE DELETE, TRUNCATE ON "pilgrim_documents" FROM "hajj_app";--> statement-breakpoint
CREATE TRIGGER pilgrim_documents_audit AFTER INSERT OR UPDATE ON "pilgrim_documents"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
