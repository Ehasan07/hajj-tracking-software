import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeBdPhone, normalizeSections, POST_KINDS, postSlug, SITE_SECTIONS, siteSlugError, THEME_KEYS } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { organization, siteFaqs, siteGallery, sitePosts, siteReviews, tenantSettings, websiteSettings } from "@hajj/db/schema";
import { router, withRoles } from "../trpc";

/** The agency's own people who arrange the website. */
const editors = withRoles("admin");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** A link to the agency's page on one of the given sites, https only. */
const pageLink = (hosts: string[]) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      try {
        const url = new URL(v);
        const host = url.hostname.replace(/^(www\.|m\.)/, "");
        if (url.protocol === "https:" && hosts.includes(host)) return url.toString();
      } catch {
        /* fall through */
      }
      ctx.addIssue({ code: "custom", message: "INVALID_LINK" });
      return z.NEVER;
    });

/** Every uploaded website image lives under the agency's own folder. */
function ownImage(tenantId: string, key: string | null | undefined) {
  if (key == null) return null;
  if (!new RegExp(`^tenants/${tenantId}/site/[0-9a-f-]{36}\\.webp$`).test(key)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "BAD_IMAGE" });
  }
  return key;
}

const imageKey = z.string().max(200).nullable().optional();

const settingsInput = z.object({
  published: z.boolean(),
  theme: z.enum(THEME_KEYS as [string, ...string[]]),
  customColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional()
    .transform((v) => v?.toLowerCase() ?? null),
  taglineBn: optionalText(160),
  taglineEn: optionalText(160),
  aboutBn: optionalText(3000),
  aboutEn: optionalText(3000),
  whatsapp: optionalText(30),
  facebookUrl: pageLink(["facebook.com", "fb.com"]),
  youtubeUrl: pageLink(["youtube.com", "youtu.be"]),
  officeHours: optionalText(120),
  phone: optionalText(30),
  email: z
    .email()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  address: optionalText(500),
});

const sectionsInput = z.array(z.object({ id: z.enum(SITE_SECTIONS), visible: z.boolean() })).max(SITE_SECTIONS.length);

const postInput = z.object({
  id: z.uuid().optional(),
  kind: z.enum(POST_KINDS),
  titleBn: z.string().trim().min(3).max(160),
  titleEn: optionalText(160),
  bodyBn: z.string().trim().min(10).max(8000),
  bodyEn: optionalText(8000),
  coverKey: imageKey,
  published: z.boolean(),
  pinned: z.boolean().default(false),
});

const faqInput = z.object({
  id: z.uuid().optional(),
  questionBn: z.string().trim().min(3).max(300),
  questionEn: optionalText(300),
  answerBn: z.string().trim().min(3).max(3000),
  answerEn: optionalText(3000),
});

const reviewInput = z.object({
  name: z.string().trim().min(2).max(80),
  place: optionalText(80),
  trip: optionalText(80),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});

type Ordered = typeof siteGallery | typeof siteFaqs;

/** Move one row up or down and number the list again from 10, 20, 30 … */
async function move(tx: Transaction, table: Ordered, id: string, dir: "up" | "down") {
  const rows = await tx.select({ id: table.id }).from(table).orderBy(asc(table.sortOrder), asc(table.createdAt));
  const at = rows.findIndex((r) => r.id === id);
  if (at < 0) throw new TRPCError({ code: "NOT_FOUND" });
  const to = dir === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= rows.length) return;
  [rows[at], rows[to]] = [rows[to]!, rows[at]!];
  for (const [i, row] of rows.entries()) await tx.update(table).set({ sortOrder: (i + 1) * 10 }).where(eq(table.id, row.id));
}

async function nextOrder(tx: Transaction, table: Ordered) {
  const [row] = await tx.select({ max: sql<number>`coalesce(max(${table.sortOrder}), 0)::int` }).from(table);
  return (row?.max ?? 0) + 10;
}

export const websiteRouter = router({
  /** Everything the website page in the software edits, with counts for the tabs. */
  get: editors.query(async ({ ctx }) => {
    const [[site], [contact], [org], [pending]] = await Promise.all([
      ctx.tx.select().from(websiteSettings).limit(1),
      ctx.tx
        .select({ legalName: tenantSettings.legalName, phone: tenantSettings.phone, email: tenantSettings.email, address: tenantSettings.address })
        .from(tenantSettings)
        .limit(1),
      ctx.tx.select({ slug: organization.slug }).from(organization).where(eq(organization.id, ctx.tenantId)),
      ctx.tx.select({ n: count() }).from(siteReviews).where(eq(siteReviews.status, "pending")),
    ]);
    return {
      settings: {
        published: site?.published ?? true,
        theme: site?.theme ?? "zamzam",
        customColor: site?.customColor ?? null,
        logoKey: site?.logoKey ?? null,
        heroKey: site?.heroKey ?? null,
        taglineBn: site?.taglineBn ?? null,
        taglineEn: site?.taglineEn ?? null,
        aboutBn: site?.aboutBn ?? null,
        aboutEn: site?.aboutEn ?? null,
        whatsapp: site?.whatsapp ?? null,
        facebookUrl: site?.facebookUrl ?? null,
        youtubeUrl: site?.youtubeUrl ?? null,
        officeHours: site?.officeHours ?? null,
        sections: normalizeSections(site?.sections),
      },
      contact: contact ?? null,
      slug: org?.slug ?? "",
      pendingReviews: pending?.n ?? 0,
    };
  }),

  save: editors.input(settingsInput).mutation(async ({ ctx, input }) => {
    const { phone, email, address, whatsapp, ...rest } = input;
    const wa = whatsapp ? (normalizeBdPhone(whatsapp) ?? whatsapp.replace(/[^\d+]/g, "")) : null;
    const values = { ...rest, whatsapp: wa };
    await ctx.tx
      .insert(websiteSettings)
      .values({ tenantId: ctx.tenantId, ...values })
      .onConflictDoUpdate({ target: websiteSettings.tenantId, set: values });
    await ctx.tx
      .update(tenantSettings)
      .set({ phone: phone ? (normalizeBdPhone(phone) ?? phone) : null, email, address })
      .where(eq(tenantSettings.tenantId, ctx.tenantId));
    return { ok: true };
  }),

  /** Which sections show, and in what order. */
  saveSections: editors.input(z.object({ sections: sectionsInput })).mutation(async ({ ctx, input }) => {
    const sections = normalizeSections(input.sections);
    await ctx.tx
      .insert(websiteSettings)
      .values({ tenantId: ctx.tenantId, sections })
      .onConflictDoUpdate({ target: websiteSettings.tenantId, set: { sections } });
    return { ok: true };
  }),

  /** Logo or the large picture at the top of the site; null removes it. */
  setImage: editors
    .input(z.object({ slot: z.enum(["logo", "hero"]), key: imageKey }))
    .mutation(async ({ ctx, input }) => {
      const key = ownImage(ctx.tenantId, input.key);
      const set = input.slot === "logo" ? { logoKey: key } : { heroKey: key };
      await ctx.tx
        .insert(websiteSettings)
        .values({ tenantId: ctx.tenantId, ...set })
        .onConflictDoUpdate({ target: websiteSettings.tenantId, set });
      return { ok: true };
    }),

  /** The address after /site/. Old links stop working, so the page asks first. */
  setSlug: editors.input(z.object({ slug: z.string().trim().toLowerCase() })).mutation(async ({ ctx, input }) => {
    const problem = siteSlugError(input.slug);
    if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
    const [taken] = await ctx.tx.select({ id: organization.id }).from(organization).where(eq(organization.slug, input.slug));
    if (taken && taken.id !== ctx.tenantId) throw new TRPCError({ code: "CONFLICT", message: "SLUG_TAKEN" });
    // The address the main domain shows can't be claimed by whoever asks first.
    if (!taken && input.slug === process.env.PUBLIC_TENANT_SLUG) throw new TRPCError({ code: "BAD_REQUEST", message: "SLUG_RESERVED" });
    await ctx.tx.update(organization).set({ slug: input.slug }).where(eq(organization.id, ctx.tenantId));
    return { slug: input.slug };
  }),

  /* ------------------------------------------------------------------ posts */

  posts: editors.query(({ ctx }) => ctx.tx.select().from(sitePosts).orderBy(desc(sitePosts.pinned), desc(sitePosts.createdAt))),

  savePost: editors.input(postInput).mutation(async ({ ctx, input }) => {
    const { id, ...fields } = input;
    const coverKey = ownImage(ctx.tenantId, fields.coverKey);
    if (id) {
      const [before] = await ctx.tx.select().from(sitePosts).where(eq(sitePosts.id, id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.tx
        .update(sitePosts)
        .set({ ...fields, coverKey, publishedAt: fields.published ? (before.publishedAt ?? new Date()) : before.publishedAt })
        .where(eq(sitePosts.id, id))
        .returning();
      return row!;
    }
    const slug = postSlug(fields.titleEn ?? fields.titleBn, randomBytes(3).toString("hex"));
    const [row] = await ctx.tx
      .insert(sitePosts)
      .values({ ...fields, coverKey, slug, publishedAt: fields.published ? new Date() : null })
      .returning();
    return row!;
  }),

  deletePost: editors.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(sitePosts).where(eq(sitePosts.id, input.id));
    return { ok: true };
  }),

  /* ---------------------------------------------------------------- gallery */

  gallery: editors.query(({ ctx }) => ctx.tx.select().from(siteGallery).orderBy(asc(siteGallery.sortOrder), asc(siteGallery.createdAt))),

  addPhoto: editors
    .input(z.object({ key: z.string().max(200), captionBn: optionalText(200), captionEn: optionalText(200) }))
    .mutation(async ({ ctx, input }) => {
      const [{ n }] = (await ctx.tx.select({ n: count() }).from(siteGallery)) as [{ n: number }];
      if (n >= 60) throw new TRPCError({ code: "BAD_REQUEST", message: "GALLERY_FULL" });
      const [row] = await ctx.tx
        .insert(siteGallery)
        .values({ imageKey: ownImage(ctx.tenantId, input.key)!, captionBn: input.captionBn, captionEn: input.captionEn, sortOrder: await nextOrder(ctx.tx, siteGallery) })
        .returning();
      return row!;
    }),

  updatePhoto: editors
    .input(z.object({ id: z.uuid(), captionBn: optionalText(200), captionEn: optionalText(200) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.tx.update(siteGallery).set({ captionBn: input.captionBn, captionEn: input.captionEn }).where(eq(siteGallery.id, input.id));
      return { ok: true };
    }),

  movePhoto: editors.input(z.object({ id: z.uuid(), dir: z.enum(["up", "down"]) })).mutation(async ({ ctx, input }) => {
    await move(ctx.tx, siteGallery, input.id, input.dir);
    return { ok: true };
  }),

  deletePhoto: editors.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(siteGallery).where(eq(siteGallery.id, input.id));
    return { ok: true };
  }),

  /* ---------------------------------------------------------------- reviews */

  reviews: editors
    .input(z.object({ status: z.enum(["pending", "approved", "hidden"]).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.tx
        .select()
        .from(siteReviews)
        .where(input?.status ? eq(siteReviews.status, input.status) : undefined)
        .orderBy(desc(siteReviews.createdAt))
        .limit(200),
    ),

  /** One collected in person, e.g. written in the office's visitor book. Shown straight away. */
  addReview: editors.input(reviewInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .insert(siteReviews)
      .values({ ...input, source: "office", status: "approved", decidedAt: new Date(), decidedBy: ctx.session.userId })
      .returning();
    return row!;
  }),

  setReviewStatus: editors
    .input(z.object({ id: z.uuid(), status: z.enum(["approved", "hidden"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.tx
        .update(siteReviews)
        .set({ status: input.status, decidedAt: new Date(), decidedBy: ctx.session.userId })
        .where(eq(siteReviews.id, input.id));
      return { ok: true };
    }),

  deleteReview: editors.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(siteReviews).where(eq(siteReviews.id, input.id));
    return { ok: true };
  }),

  /* ------------------------------------------------------------------- faqs */

  faqs: editors.query(({ ctx }) => ctx.tx.select().from(siteFaqs).orderBy(asc(siteFaqs.sortOrder), asc(siteFaqs.createdAt))),

  saveFaq: editors.input(faqInput).mutation(async ({ ctx, input }) => {
    const { id, ...fields } = input;
    if (id) {
      const [row] = await ctx.tx.update(siteFaqs).set(fields).where(eq(siteFaqs.id, id)).returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }
    const [row] = await ctx.tx
      .insert(siteFaqs)
      .values({ ...fields, sortOrder: await nextOrder(ctx.tx, siteFaqs) })
      .returning();
    return row!;
  }),

  moveFaq: editors.input(z.object({ id: z.uuid(), dir: z.enum(["up", "down"]) })).mutation(async ({ ctx, input }) => {
    await move(ctx.tx, siteFaqs, input.id, input.dir);
    return { ok: true };
  }),

  deleteFaq: editors.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(siteFaqs).where(eq(siteFaqs.id, input.id));
    return { ok: true };
  }),

  /** For the nav badge: reviews waiting for a decision. */
  pendingCount: editors.query(async ({ ctx }) => {
    const [row] = await ctx.tx.select({ n: count() }).from(siteReviews).where(and(eq(siteReviews.status, "pending")));
    return row?.n ?? 0;
  }),
});
