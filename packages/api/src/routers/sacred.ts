import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ITEMS, STEPS, SUNNAH } from "@hajj/sacred";
import { sacredReviews, type SacredReview } from "@hajj/db/schema";
import { router, tenantProcedure, withRoles } from "../trpc";

/** Every reviewable piece of content, with how many text entries it has. */
const CONTENT = new Map<string, number>([
  ...ITEMS.map((i) => [`item:${i.id}`, i.arabic.type === "quran" ? i.arabic.refs.length : 1] as const),
  ...STEPS.map((s) => [`step:${s.id}`, 1] as const),
  ...SUNNAH.map((s) => [`sunnah:${s.id}`, 1] as const),
]);

export type ReviewMap = Record<string, Pick<SacredReview, "status" | "meaningBn" | "meaningEn" | "pronunciation" | "reviewerNote" | "reviewedAt">>;

export const sacredRouter = router({
  /** Review state for everything, keyed by content id. */
  reviews: tenantProcedure.query(async ({ ctx }) => {
    const rows = await ctx.tx.select().from(sacredReviews);
    return Object.fromEntries(
      rows.map((r) => [
        r.contentId,
        {
          status: r.status,
          meaningBn: r.meaningBn,
          meaningEn: r.meaningEn,
          pronunciation: r.pronunciation,
          reviewerNote: r.reviewerNote,
          reviewedAt: r.reviewedAt,
        },
      ]),
    ) as ReviewMap;
  }),

  /** The agency's scholar approves a draft, rewrites it, or asks for changes. */
  review: withRoles("admin", "alim")
    .input(
      z.object({
        contentId: z.string().max(80),
        status: z.enum(["approved", "changes_requested"]),
        meaningBn: z.array(z.string().trim().max(4000)).max(20).default([]),
        meaningEn: z.array(z.string().trim().max(4000)).max(20).default([]),
        pronunciation: z.string().trim().max(2000).optional(),
        reviewerNote: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expected = CONTENT.get(input.contentId);
      if (expected === undefined) throw new TRPCError({ code: "NOT_FOUND" });
      for (const list of [input.meaningBn, input.meaningEn]) {
        if (list.length !== 0 && list.length !== expected) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "MEANING_COUNT" });
        }
      }
      const values = {
        status: input.status,
        meaningBn: input.meaningBn,
        meaningEn: input.meaningEn,
        pronunciation: input.pronunciation || null,
        reviewerNote: input.reviewerNote || null,
        reviewedBy: ctx.session.userId,
        reviewedAt: new Date(),
      };
      const [row] = await ctx.tx
        .insert(sacredReviews)
        .values({ contentId: input.contentId, ...values })
        .onConflictDoUpdate({ target: [sacredReviews.tenantId, sacredReviews.contentId], set: values })
        .returning();
      return row!;
    }),
});
