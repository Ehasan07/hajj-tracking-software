ALTER TABLE "pilgrims" ADD COLUMN "erased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "erased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "erased_at" timestamp with time zone;