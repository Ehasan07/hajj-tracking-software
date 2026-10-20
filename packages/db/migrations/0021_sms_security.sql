-- SMS history is kept: the app role writes new messages only, never edits or removes them.
REVOKE UPDATE, DELETE, TRUNCATE ON "sms_messages" FROM "hajj_app";--> statement-breakpoint
CREATE TRIGGER sms_messages_audit AFTER INSERT ON "sms_messages"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();--> statement-breakpoint

-- The sender takes the next messages to send, across agencies. A message
-- left waiting a day is dropped rather than sent late, and one caught
-- mid-send by a restart is marked failed rather than sent twice.
CREATE OR REPLACE FUNCTION sms_claim(p_limit int) RETURNS TABLE (id uuid, to_phone text, body text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sms_messages SET status = 'expired', error = 'not sent within a day'
    WHERE status = 'queued' AND created_at < now() - interval '1 day';
  UPDATE sms_messages SET status = 'failed', error = 'interrupted while sending'
    WHERE status = 'sending' AND created_at < now() - interval '10 minutes';
  RETURN QUERY
  UPDATE sms_messages m SET status = 'sending'
  WHERE m.id IN (
    SELECT q.id FROM sms_messages q WHERE q.status = 'queued' ORDER BY q.created_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  RETURNING m.id, m.to_phone, m.body;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION sms_claim(int) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sms_claim(int) TO "hajj_app";--> statement-breakpoint

CREATE OR REPLACE FUNCTION sms_finish(p_id uuid, p_ok boolean, p_ref text, p_error text) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE sms_messages
     SET status = CASE WHEN p_ok THEN 'sent' ELSE 'failed' END,
         provider_ref = left(p_ref, 120),
         error = left(p_error, 300),
         sent_at = CASE WHEN p_ok THEN now() END
   WHERE id = p_id AND status = 'sending'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION sms_finish(uuid, boolean, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sms_finish(uuid, boolean, text, text) TO "hajj_app";
