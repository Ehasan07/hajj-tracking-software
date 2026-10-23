CREATE TABLE "guide_recordings" (
	"item_id" text PRIMARY KEY NOT NULL,
	"reciter" text NOT NULL,
	"file_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
