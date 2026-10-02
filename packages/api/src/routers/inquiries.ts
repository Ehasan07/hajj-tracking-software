import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { normalizeBdPhone } from "@hajj/core";
import { inquiries, travelPackages } from "@hajj/db/schema";
import { getSettings, nextReference } from "../services/tenant";
import { router, tenantProcedure } from "../trpc";
import { optionalText, phoneInput } from "./shared";

const statuses = ["new", "follow_up", "converted", "closed"] as const;

export const inquiriesRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          status: z.enum(statuses).optional(),
          q: z.string().trim().max(60).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input?.status) filters.push(eq(inquiries.status, input.status));
      if (input?.q) {
        const phone = normalizeBdPhone(input.q);
        filters.push(
          or(
            ilike(inquiries.name, `%${input.q}%`),
            eq(inquiries.ref, input.q.toUpperCase()),
            phone ? eq(inquiries.phone, phone) : undefined,
          )!,
        );
      }
      return ctx.tx
        .select({
          id: inquiries.id,
          ref: inquiries.ref,
          name: inquiries.name,
          phone: inquiries.phone,
          interest: inquiries.interest,
          partySize: inquiries.partySize,
          status: inquiries.status,
          followUpOn: inquiries.followUpOn,
          notes: inquiries.notes,
          createdAt: inquiries.createdAt,
          convertedPilgrimId: inquiries.convertedPilgrimId,
          packageName: travelPackages.name,
        })
        .from(inquiries)
        .leftJoin(travelPackages, eq(travelPackages.id, inquiries.packageId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(
          sql`case ${inquiries.status} when 'follow_up' then 0 when 'new' then 1 else 2 end`,
          desc(inquiries.createdAt),
        )
        .limit(input?.limit ?? 50);
    }),

  get: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx.select().from(inquiries).where(eq(inquiries.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  counts: tenantProcedure.query(async ({ ctx }) => {
    const rows = await ctx.tx
      .select({ status: inquiries.status, n: sql<number>`count(*)::int` })
      .from(inquiries)
      .groupBy(inquiries.status);
    return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<(typeof statuses)[number], number>>;
  }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        phone: phoneInput,
        interest: z.enum(["hajj", "umrah", "other"]),
        packageId: z.uuid().optional(),
        partySize: z.number().int().min(1).max(100).default(1),
        notes: optionalText(2000),
        followUpOn: z.iso.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const ref = await nextReference(ctx.tx, settings, "inquiry");
      const [row] = await ctx.tx
        .insert(inquiries)
        .values({ ...input, ref, status: input.followUpOn ? "follow_up" : "new" })
        .returning();
      return row!;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(["new", "follow_up", "closed"]).optional(),
        followUpOn: z.iso.date().nullable().optional(),
        notes: optionalText(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [current] = await ctx.tx.select({ status: inquiries.status }).from(inquiries).where(eq(inquiries.id, id));
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      if (current.status === "converted") throw new TRPCError({ code: "CONFLICT", message: "ALREADY_CONVERTED" });
      const [row] = await ctx.tx.update(inquiries).set(patch).where(eq(inquiries.id, id)).returning();
      return row!;
    }),
});
