CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"kind" text NOT NULL,
	"batch_id" uuid,
	"source_id" uuid,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"parts" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_ref" text,
	"error" text,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "sms_messages_kind" CHECK ("sms_messages"."kind" in ('receipt', 'notice')),
	CONSTRAINT "sms_messages_status" CHECK ("sms_messages"."status" in ('queued', 'sending', 'sent', 'failed', 'skipped', 'expired')),
	CONSTRAINT "sms_messages_parts" CHECK ("sms_messages"."parts" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "sms_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_otps" DROP CONSTRAINT "email_otps_purpose";--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD COLUMN "sms_receipts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_messages_tenant_idx" ON "sms_messages" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "sms_messages_queue_idx" ON "sms_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "sms_messages_batch_idx" ON "sms_messages" USING btree ("tenant_id","batch_id");--> statement-breakpoint
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_purpose" CHECK ("email_otps"."purpose" in ('device', 'reset', 'phone', 'phone_reset'));--> statement-breakpoint
CREATE POLICY "sms_messages_tenant_isolation" ON "sms_messages" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));