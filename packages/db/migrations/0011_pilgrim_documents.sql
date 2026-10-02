CREATE TYPE "public"."blood_group" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('received', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "pilgrim_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"pilgrim_id" uuid NOT NULL,
	"type" text NOT NULL,
	"file_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "document_status" DEFAULT 'received' NOT NULL,
	"note" text,
	"expires_on" date,
	"uploaded_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "pilgrim_documents_size" CHECK ("pilgrim_documents"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "pilgrim_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "mother_name" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "spouse_name" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "blood_group" "blood_group";--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "permanent_address" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "nid_enc" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "nid_index" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "nid_last4" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "prp_number" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "hajj_reg_number" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "visa_number" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "mahram_name" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "mahram_relation" text;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD COLUMN "mahram_pilgrim_id" uuid;--> statement-breakpoint
ALTER TABLE "pilgrim_documents" ADD CONSTRAINT "pilgrim_documents_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrim_documents" ADD CONSTRAINT "pilgrim_documents_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pilgrim_documents_pilgrim_idx" ON "pilgrim_documents" USING btree ("tenant_id","pilgrim_id","type","uploaded_at");--> statement-breakpoint
CREATE INDEX "pilgrims_nid_idx" ON "pilgrims" USING btree ("tenant_id","nid_index");--> statement-breakpoint
CREATE POLICY "pilgrim_documents_tenant_isolation" ON "pilgrim_documents" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));