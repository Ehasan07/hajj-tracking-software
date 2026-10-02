import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { articles } from "@hajj/db/schema";
import { router, tenantProcedure, withRoles } from "../trpc";

const categories = ["hajj", "umrah", "documents", "costs", "health", "faq"] as const;

const articleInput = z.object({
  category: z.enum(categories),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "INVALID_SLUG")
    .max(80),
  titleBn: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  bodyBn: z.string().trim().min(2).max(20_000),
  bodyEn: z.string().trim().min(2).max(20_000),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const articlesRouter = router({
  list: tenantProcedure
    .input(z.object({ category: z.enum(categories).optional(), publishedOnly: z.boolean().default(false) }).optional())
    .query(({ ctx, input }) =>
      ctx.tx
        .select()
        .from(articles)
        .where(
          and(
            input?.category ? eq(articles.category, input.category) : undefined,
            input?.publishedOnly ? eq(articles.published, true) : undefined,
          ),
        )
        .orderBy(asc(articles.category), asc(articles.sortOrder), asc(articles.titleBn)),
    ),

  get: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx.select().from(articles).where(eq(articles.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  save: withRoles("admin", "staff")
    .input(articleInput.extend({ id: z.uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      try {
        if (id) {
          const [row] = await ctx.tx.update(articles).set(values).where(eq(articles.id, id)).returning();
          if (!row) throw new TRPCError({ code: "NOT_FOUND" });
          return row;
        }
        const [row] = await ctx.tx.insert(articles).values(values).returning();
        return row!;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (String((error as { cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code) === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "SLUG_TAKEN" });
        }
        throw error;
      }
    }),
});
