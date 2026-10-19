import "server-only";
import { and, asc, avg, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { normalizeSections, siteTheme } from "@hajj/core";
import { db, withTenant } from "@hajj/db";
import {
  articles,
  sacredReviews,
  siteFaqs,
  siteGallery,
  sitePosts,
  siteReviews,
  tenantSettings,
  travelPackages,
  websiteSettings,
} from "@hajj/db/schema";
import { sql } from "drizzle-orm";
import { member } from "@hajj/db/schema";
import { getSession } from "./session";
import { siteImageUrl } from "./site-media";

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

/** Whether the signed-in person runs this agency (owner or admin), so may preview its switched-off website. */
export async function canPreviewSite(tenantId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, tenantId), eq(member.userId, session.user.id)))
    .limit(1);
  return row?.role === "owner" || row?.role === "admin";
}

/** The agency whose website lives at /site/<slug>. */
export const resolveSiteSlug = cache(async (slug: string): Promise<string | null> => {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const [row] = await db.execute<{ id: string | null }>(sql`select resolve_public_tenant('', ${slug}) as id`);
  return row?.id ?? null;
});

export interface ApprovedReview {
  meaningBn: string[];
  meaningEn: string[];
  pronunciation: string | null;
}

/** Everything the public pages may show. Only active packages, published posts, approved reviews and the like. */
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
    const [web] = await tx.select().from(websiteSettings).limit(1);
    const [slugRow] = (await tx.execute(sql`select public_site_slug(${tenantId}) as slug`)) as unknown as [{ slug: string | null }?];
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
        imageKey: travelPackages.imageKey,
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
    const posts = await tx
      .select({
        id: sitePosts.id,
        slug: sitePosts.slug,
        kind: sitePosts.kind,
        titleBn: sitePosts.titleBn,
        titleEn: sitePosts.titleEn,
        bodyBn: sitePosts.bodyBn,
        bodyEn: sitePosts.bodyEn,
        coverKey: sitePosts.coverKey,
        pinned: sitePosts.pinned,
        publishedAt: sitePosts.publishedAt,
      })
      .from(sitePosts)
      .where(eq(sitePosts.published, true))
      .orderBy(desc(sitePosts.pinned), desc(sitePosts.publishedAt))
      .limit(6);
    const gallery = await tx
      .select({ id: siteGallery.id, imageKey: siteGallery.imageKey, captionBn: siteGallery.captionBn, captionEn: siteGallery.captionEn })
      .from(siteGallery)
      .orderBy(asc(siteGallery.sortOrder), asc(siteGallery.createdAt))
      .limit(24);
    const testimonials = await tx
      .select({ id: siteReviews.id, name: siteReviews.name, place: siteReviews.place, trip: siteReviews.trip, rating: siteReviews.rating, body: siteReviews.body })
      .from(siteReviews)
      .where(eq(siteReviews.status, "approved"))
      .orderBy(desc(siteReviews.createdAt))
      .limit(12);
    const [score] = await tx
      .select({ n: count(), average: avg(siteReviews.rating) })
      .from(siteReviews)
      .where(eq(siteReviews.status, "approved"));
    const faqs = await tx
      .select({ id: siteFaqs.id, questionBn: siteFaqs.questionBn, questionEn: siteFaqs.questionEn, answerBn: siteFaqs.answerBn, answerEn: siteFaqs.answerEn })
      .from(siteFaqs)
      .orderBy(asc(siteFaqs.sortOrder), asc(siteFaqs.createdAt))
      .limit(50);
    return {
      settings: settings ?? null,
      slug: slugRow?.slug ?? null,
      web: {
        published: web?.published ?? true,
        theme: siteTheme(web?.theme, web?.customColor),
        logoUrl: siteImageUrl(web?.logoKey),
        heroUrl: siteImageUrl(web?.heroKey),
        taglineBn: web?.taglineBn ?? null,
        taglineEn: web?.taglineEn ?? null,
        aboutBn: web?.aboutBn ?? null,
        aboutEn: web?.aboutEn ?? null,
        whatsapp: web?.whatsapp ?? null,
        facebookUrl: web?.facebookUrl ?? null,
        youtubeUrl: web?.youtubeUrl ?? null,
        officeHours: web?.officeHours ?? null,
        sections: normalizeSections(web?.sections),
      },
      packages: packages.map(({ imageKey, ...p }) => ({ ...p, imageUrl: siteImageUrl(imageKey) })),
      approved: new Map<string, ApprovedReview>(reviews.map((r) => [r.contentId, r])),
      guide,
      posts: posts.map(({ coverKey, ...p }) => ({ ...p, coverUrl: siteImageUrl(coverKey) })),
      gallery: gallery.map(({ imageKey, ...g }) => ({ ...g, url: siteImageUrl(imageKey)! })),
      testimonials,
      rating: { count: score?.n ?? 0, average: score?.average ? Number(score.average) : null },
      faqs,
    };
  }),
);

/** One published post, for its own page. */
export const loadPost = cache(async (tenantId: string, slug: string) =>
  withTenant(db, { tenantId, userId: PUBLIC_ACTOR }, async (tx) => {
    const [post] = await tx
      .select()
      .from(sitePosts)
      .where(and(eq(sitePosts.slug, slug), eq(sitePosts.published, true)))
      .limit(1);
    return post ? { ...post, coverUrl: siteImageUrl(post.coverKey) } : null;
  }),
);
