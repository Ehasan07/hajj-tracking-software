import { sql } from "drizzle-orm";
import { pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { tenantId, tenantIsolation } from "./_shared";

export const reviewStatusEnum = pgEnum("review_status", ["approved", "changes_requested"]);

/**
 * A scholar's review of one piece of religious content (an ayah's meaning, a
 * dua, a guide step, a sunnah practice) for one agency. The Arabic itself is
 * fixed in code from verified sources; what the scholar approves or rewrites
 * is the Bangla and English around it. Nothing unapproved is shown publicly.
 */
export const sacredReviews = pgTable(
  "sacred_reviews",
  {
    tenantId: tenantId(),
    /** e.g. "item:dua_talbiyah", "step:umrah_tawaf", "sunnah:ramal" */
    contentId: text().notNull(),
    status: reviewStatusEnum().notNull(),
    /** The scholar's wording, one entry per verse; empty means the draft was accepted as is. */
    meaningBn: text().array().notNull().default(sql`'{}'::text[]`),
    meaningEn: text().array().notNull().default(sql`'{}'::text[]`),
    pronunciation: text(),
    reviewerNote: text(),
    reviewedBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    reviewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.contentId] }), tenantIsolation("sacred_reviews")],
).enableRLS();

export type SacredReview = typeof sacredReviews.$inferSelect;
