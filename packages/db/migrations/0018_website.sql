CREATE TABLE "site_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"question_bn" text NOT NULL,
	"question_en" text,
	"answer_bn" text NOT NULL,
	"answer_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"image_key" text NOT NULL,
	"caption_bn" text,
	"caption_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_gallery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"kind" text DEFAULT 'news' NOT NULL,
	"slug" text NOT NULL,
	"title_bn" text NOT NULL,
	"title_en" text,
	"body_bn" text NOT NULL,
	"body_en" text,
	"cover_key" text,
	"published" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_posts_kind" CHECK ("site_posts"."kind" in ('news', 'notice', 'offer'))
);
--> statement-breakpoint
ALTER TABLE "site_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"name" text NOT NULL,
	"place" text,
	"trip" text,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_reviews_rating" CHECK ("site_reviews"."rating" between 1 and 5),
	CONSTRAINT "site_reviews_source" CHECK ("site_reviews"."source" in ('website', 'office')),
	CONSTRAINT "site_reviews_status" CHECK ("site_reviews"."status" in ('pending', 'approved', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "site_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "website_settings" (
	"tenant_id" text PRIMARY KEY DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'zamzam' NOT NULL,
	"custom_color" text,
	"logo_key" text,
	"hero_key" text,
	"tagline_bn" text,
	"tagline_en" text,
	"about_bn" text,
	"about_en" text,
	"whatsapp" text,
	"facebook_url" text,
	"youtube_url" text,
	"office_hours" text,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_settings_color" CHECK ("website_settings"."custom_color" is null or "website_settings"."custom_color" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "website_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "travel_packages" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "site_faqs" ADD CONSTRAINT "site_faqs_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_gallery" ADD CONSTRAINT "site_gallery_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_reviews" ADD CONSTRAINT "site_reviews_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_settings" ADD CONSTRAINT "website_settings_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_faqs_order_idx" ON "site_faqs" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE INDEX "site_gallery_order_idx" ON "site_gallery" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "site_posts_slug_idx" ON "site_posts" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "site_posts_list_idx" ON "site_posts" USING btree ("tenant_id","published","published_at");--> statement-breakpoint
CREATE INDEX "site_reviews_status_idx" ON "site_reviews" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE POLICY "site_faqs_tenant_isolation" ON "site_faqs" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "site_gallery_tenant_isolation" ON "site_gallery" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "site_posts_tenant_isolation" ON "site_posts" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "site_reviews_tenant_isolation" ON "site_reviews" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "website_settings_tenant_isolation" ON "website_settings" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));