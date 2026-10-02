CREATE TYPE "public"."review_status" AS ENUM('approved', 'changes_requested');--> statement-breakpoint
CREATE TABLE "sacred_reviews" (
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"content_id" text NOT NULL,
	"status" "review_status" NOT NULL,
	"meaning_bn" text[] DEFAULT '{}'::text[] NOT NULL,
	"meaning_en" text[] DEFAULT '{}'::text[] NOT NULL,
	"pronunciation" text,
	"reviewer_note" text,
	"reviewed_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sacred_reviews_tenant_id_content_id_pk" PRIMARY KEY("tenant_id","content_id")
);
--> statement-breakpoint
ALTER TABLE "sacred_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sacred_reviews" ADD CONSTRAINT "sacred_reviews_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "sacred_reviews_tenant_isolation" ON "sacred_reviews" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));