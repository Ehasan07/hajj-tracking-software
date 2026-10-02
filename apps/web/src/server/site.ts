import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { db, withTenant } from "@hajj/db";
import { articles, sacredReviews, tenantSettings, travelPackages } from "@hajj/db/schema";
import { sql } from "drizzle-orm";

/** Visitors of the public site act as this pseudo-user; it owns nothing and appears in audit rows. */
export const PUBLIC_ACTOR = "public-website";

/** The agency this request's public website belongs to, by host name, else the configured default. */
export const resolvePublicTenant = cache(async (): Promise<string | null> => {
  const host = ((await headers()).get("host") ?? "").split(":")[0]!.toLowerCase();
  const slug = process.env.PUBLIC_TENANT_SLUG ?? "";
  if (!host && !slug) return null;
  const [row] = await db.execute<{ id: string | null }>(sql`select resolve_public_tenant(${host}, ${slug}) as id`);
  return row?.id ?? null;
});

export interface ApprovedReview {
  meaningBn: string[];
  meaningEn: string[];
  pronunciation: string | null;
}

/** Everything the public pages may show. Only active packages, published articles and approved reviews. */
export const loadSite = cache(async (tenantId: string) =>
  withTenant(db, { tenantId, userId: PUBLIC_ACTOR }, async (tx) => {
    const [settings] = await tx
      .select({
        legalName: tenantSettings.legalName,
        licenseNumber: tenantSettings.licenseNumber,
        address: tenantSettings.address,
        phone: tenantSettings.phone,
        email: tenantSettings.email,
        showDraftMeanings: tenantSettings.showDraftMeanings,
      })
      .from(tenantSettings)
      .limit(1);
    const packages = await tx
      .select({
        id: travelPackages.id,
        kind: travelPackages.kind,
        name: travelPackages.name,
        season: travelPackages.season,
        price: travelPackages.price,
        currency: travelPackages.currency,
        days: travelPackages.days,
        notes: travelPackages.notes,
      })
      .from(travelPackages)
      .where(eq(travelPackages.active, true))
      .orderBy(asc(travelPackages.kind), asc(travelPackages.price));
    const reviews = await tx
      .select({
        contentId: sacredReviews.contentId,
        meaningBn: sacredReviews.meaningBn,
        meaningEn: sacredReviews.meaningEn,
        pronunciation: sacredReviews.pronunciation,
      })
      .from(sacredReviews)
      .where(eq(sacredReviews.status, "approved"));
    const guide = await tx
      .select({ id: articles.id, slug: articles.slug, category: articles.category, titleBn: articles.titleBn, titleEn: articles.titleEn })
      .from(articles)
      .where(and(eq(articles.published, true)))
      .orderBy(asc(articles.sortOrder))
      .limit(6);
    return {
      settings: settings ?? null,
      packages,
      approved: new Map<string, ApprovedReview>(reviews.map((r) => [r.contentId, r])),
      guide,
    };
  }),
);
