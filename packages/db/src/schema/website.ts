import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { SectionSetting } from "@hajj/core";
import { id, tenantId, tenantIsolation, timestamps } from "./_shared";

/**
 * Each agency's public website, as the agency arranges it from the software.
 * Images are stored under `tenants/<tenant>/site/` and served only while a row
 * here still points at them (see `site_media_visible`).
 */

/** One row per agency: look, words and links. Contact details stay in tenant_settings. */
export const websiteSettings = pgTable(
  "website_settings",
  {
    tenantId: tenantId().primaryKey(),
    /** Off: visitors get "not found"; the agency's own managers can still preview it. */
    published: boolean().notNull().default(true),
    theme: text().notNull().default("zamzam"),
    /** A colour of the agency's own (#rrggbb), used instead of the preset. */
    customColor: text(),
    logoKey: text(),
    heroKey: text(),
    taglineBn: text(),
    taglineEn: text(),
    aboutBn: text(),
    aboutEn: text(),
    whatsapp: text(),
    facebookUrl: text(),
    youtubeUrl: text(),
    officeHours: text(),
    sections: jsonb().$type<SectionSetting[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [
    check("website_settings_color", sql`${t.customColor} is null or ${t.customColor} ~ '^#[0-9a-f]{6}$'`),
    tenantIsolation("website_settings"),
  ],
).enableRLS();

/** News, notices and offers the agency publishes. */
export const sitePosts = pgTable(
  "site_posts",
  {
    id: id(),
    tenantId: tenantId(),
    kind: text().notNull().default("news"),
    slug: text().notNull(),
    titleBn: text().notNull(),
    titleEn: text(),
    bodyBn: text().notNull(),
    bodyEn: text(),
    coverKey: text(),
    published: boolean().notNull().default(false),
    pinned: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("site_posts_kind", sql`${t.kind} in ('news', 'notice', 'offer')`),
    uniqueIndex("site_posts_slug_idx").on(t.tenantId, t.slug),
    index("site_posts_list_idx").on(t.tenantId, t.published, t.publishedAt),
    tenantIsolation("site_posts"),
  ],
).enableRLS();

/** Photos from past journeys. */
export const siteGallery = pgTable(
  "site_gallery",
  {
    id: id(),
    tenantId: tenantId(),
    imageKey: text().notNull(),
    captionBn: text(),
    captionEn: text(),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("site_gallery_order_idx").on(t.tenantId, t.sortOrder), tenantIsolation("site_gallery")],
).enableRLS();

/**
 * What pilgrims say. Visitors write them on the website (they arrive
 * "pending" and show only once the agency approves); the office can also add
 * ones collected in person.
 */
export const siteReviews = pgTable(
  "site_reviews",
  {
    id: id(),
    tenantId: tenantId(),
    name: text().notNull(),
    place: text(),
    trip: text(),
    rating: integer().notNull(),
    body: text().notNull(),
    source: text().notNull().default("website"),
    status: text().notNull().default("pending"),
    decidedAt: timestamp({ withTimezone: true }),
    decidedBy: text(),
    ...timestamps,
  },
  (t) => [
    check("site_reviews_rating", sql`${t.rating} between 1 and 5`),
    check("site_reviews_source", sql`${t.source} in ('website', 'office')`),
    check("site_reviews_status", sql`${t.status} in ('pending', 'approved', 'hidden')`),
    index("site_reviews_status_idx").on(t.tenantId, t.status, t.createdAt),
    tenantIsolation("site_reviews"),
  ],
).enableRLS();

/** Questions people ask again and again. */
export const siteFaqs = pgTable(
  "site_faqs",
  {
    id: id(),
    tenantId: tenantId(),
    questionBn: text().notNull(),
    questionEn: text(),
    answerBn: text().notNull(),
    answerEn: text(),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("site_faqs_order_idx").on(t.tenantId, t.sortOrder), tenantIsolation("site_faqs")],
).enableRLS();

export type WebsiteSettings = typeof websiteSettings.$inferSelect;
export type SitePost = typeof sitePosts.$inferSelect;
export type SiteReview = typeof siteReviews.$inferSelect;
