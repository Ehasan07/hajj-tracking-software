import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { parseAmount } from "@hajj/core";
import { travelPackages } from "@hajj/db/schema";
import { router, tenantProcedure, withRoles } from "../trpc";
import { amountInput } from "./shared";

const packageInput = z.object({
  kind: z.enum(["hajj", "umrah"]),
  name: z.string().trim().min(2).max(120),
  season: z.string().trim().min(2).max(20),
  price: amountInput,
  days: z.number().int().min(1).max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const packagesRouter = router({
  list: tenantProcedure
    .input(z.object({ activeOnly: z.boolean().default(false) }).optional())
    .query(({ ctx, input }) =>
      ctx.tx
        .select()
        .from(travelPackages)
        .where(input?.activeOnly ? eq(travelPackages.active, true) : undefined)
        .orderBy(desc(travelPackages.active), asc(travelPackages.kind), asc(travelPackages.price)),
    ),

  create: withRoles("admin")
    .input(packageInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .insert(travelPackages)
        .values({ ...input, price: parseAmount(input.price) })
        .returning();
      return row!;
    }),

  /** The photo shown on the website's package card; null removes it. */
  setImage: withRoles("admin")
    .input(z.object({ id: z.uuid(), imageKey: z.string().max(200).nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (input.imageKey && !new RegExp(`^tenants/${ctx.tenantId}/site/[0-9a-f-]{36}\\.webp$`).test(input.imageKey)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BAD_IMAGE" });
      }
      const [row] = await ctx.tx
        .update(travelPackages)
        .set({ imageKey: input.imageKey })
        .where(eq(travelPackages.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  setActive: withRoles("admin")
    .input(z.object({ id: z.uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .update(travelPackages)
        .set({ active: input.active })
        .where(eq(travelPackages.id, input.id))
        .returning();
      return row ?? null;
    }),
});
