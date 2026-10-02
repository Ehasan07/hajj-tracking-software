ALTER TABLE "tenant_settings" ADD COLUMN "public_host" text;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_publicHost_unique" UNIQUE("public_host");