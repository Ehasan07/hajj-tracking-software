CREATE TYPE "public"."article_category" AS ENUM('hajj', 'umrah', 'documents', 'costs', 'health', 'faq');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."inquiry_interest" AS ENUM('hajj', 'umrah', 'other');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'follow_up', 'converted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."package_kind" AS ENUM('hajj', 'umrah');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bkash', 'nagad', 'rocket', 'bank', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."pilgrim_status" AS ENUM('registered', 'documents', 'visa', 'ready', 'travelled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"slug" text NOT NULL,
	"category" "article_category" NOT NULL,
	"title_bn" text NOT NULL,
	"title_en" text NOT NULL,
	"body_bn" text NOT NULL,
	"body_en" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"ref" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"interest" "inquiry_interest" DEFAULT 'hajj' NOT NULL,
	"package_id" uuid,
	"party_size" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"follow_up_on" date,
	"converted_pilgrim_id" uuid,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_party_size" CHECK ("inquiries"."party_size" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"receipt_no" text NOT NULL,
	"pilgrim_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" "currency" NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"purpose" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"received_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"verify_token" text NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"void_reason" text,
	"void_ledger_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_void_complete" CHECK (("payments"."voided_at" is null) = ("payments"."void_reason" is null) and ("payments"."voided_at" is null) = ("payments"."void_ledger_entry_id" is null))
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pilgrims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"ref" text NOT NULL,
	"full_name" text NOT NULL,
	"father_name" text,
	"phone" text NOT NULL,
	"alt_phone" text,
	"email" text,
	"gender" "gender",
	"date_of_birth" date,
	"address" text,
	"district" text,
	"passport_number_enc" text,
	"passport_index" text,
	"passport_last2" text,
	"passport_expiry" date,
	"nationality" text DEFAULT 'BGD',
	"passport_scan_key" text,
	"package_id" uuid,
	"package_price" bigint DEFAULT 0 NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"currency" "currency" DEFAULT 'BDT' NOT NULL,
	"status" "pilgrim_status" DEFAULT 'registered' NOT NULL,
	"emergency_name" text,
	"emergency_phone" text,
	"notes" text,
	"inquiry_id" uuid,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilgrims_amounts" CHECK ("pilgrims"."package_price" >= 0 and "pilgrims"."discount" >= 0 and "pilgrims"."discount" <= "pilgrims"."package_price")
);
--> statement-breakpoint
ALTER TABLE "pilgrims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "travel_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"kind" "package_kind" NOT NULL,
	"name" text NOT NULL,
	"season" text NOT NULL,
	"price" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BDT' NOT NULL,
	"days" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "travel_packages_price_positive" CHECK ("travel_packages"."price" > 0)
);
--> statement-breakpoint
ALTER TABLE "travel_packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_package_id_travel_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."travel_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD CONSTRAINT "pilgrims_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD CONSTRAINT "pilgrims_package_id_travel_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."travel_packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD CONSTRAINT "pilgrims_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_packages" ADD CONSTRAINT "travel_packages_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "articles_list_idx" ON "articles" USING btree ("tenant_id","category","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_ref_idx" ON "inquiries" USING btree ("tenant_id","ref");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("tenant_id","status","follow_up_on");--> statement-breakpoint
CREATE INDEX "inquiries_phone_idx" ON "inquiries" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_receipt_idx" ON "payments" USING btree ("tenant_id","receipt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_verify_idx" ON "payments" USING btree ("verify_token");--> statement-breakpoint
CREATE INDEX "payments_pilgrim_idx" ON "payments" USING btree ("tenant_id","pilgrim_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("tenant_id","business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "pilgrims_ref_idx" ON "pilgrims" USING btree ("tenant_id","ref");--> statement-breakpoint
CREATE INDEX "pilgrims_passport_idx" ON "pilgrims" USING btree ("tenant_id","passport_index");--> statement-breakpoint
CREATE INDEX "pilgrims_phone_idx" ON "pilgrims" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "pilgrims_name_trgm_idx" ON "pilgrims" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "pilgrims_package_idx" ON "pilgrims" USING btree ("tenant_id","package_id");--> statement-breakpoint
CREATE INDEX "travel_packages_tenant_idx" ON "travel_packages" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE POLICY "articles_tenant_isolation" ON "articles" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "inquiries_tenant_isolation" ON "inquiries" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "payments_tenant_isolation" ON "payments" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "pilgrims_tenant_isolation" ON "pilgrims" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "travel_packages_tenant_isolation" ON "travel_packages" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));