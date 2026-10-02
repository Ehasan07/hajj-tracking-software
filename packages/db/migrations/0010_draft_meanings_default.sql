ALTER TABLE "tenant_settings" ALTER COLUMN "show_draft_meanings" SET DEFAULT true;--> statement-breakpoint
UPDATE "tenant_settings" SET "show_draft_meanings" = true;
