CREATE TRIGGER sacred_reviews_audit AFTER INSERT OR UPDATE OR DELETE ON "sacred_reviews"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
