import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { BUSINESS_UNITS, parseRate } from "@hajj/core";
import { withTenant } from "@hajj/db";
import { exchangeRates, member, plans, subscriptions, tenantSettings } from "@hajj/db/schema";
import { sql } from "drizzle-orm";
import { subscriptionInactive } from "../trpc";
import { unitAccess } from "../services/units";
import { protectedProcedure, router, tenantProcedure, withRoles } from "../trpc";

const settingsInput = z.object({
  legalName: z.string().trim().min(2).max(200),
  referencePrefix: z.string().regex(/^[A-Z]{2,5}$/),
  licenseNumber: z.string().trim().max(60).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.email().optional(),
  defaultLocale: z.enum(["bn", "en"]),
  enabledUnits: z.array(z.enum(BUSINESS_UNITS)).min(1),
  showDraftMeanings: z.boolean().optional(),
});

export const tenantRouter = router({
  /** First-run setup right after the agency (organization) is created. */
  initialize: protectedProcedure
    .input(settingsInput.extend({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...settings } = input;
      const [membership] = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(eq(member.userId, ctx.session.userId), eq(member.organizationId, organizationId)),
        )
        .limit(1);
      if (membership?.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });

      return withTenant(
        ctx.db,
        { tenantId: organizationId, userId: ctx.session.userId },
        async (tx) => {
          const [row] = await tx
            .insert(tenantSettings)
            .values({ tenantId: organizationId, ...settings })
            .onConflictDoNothing()
            .returning();
          if (!row) throw new TRPCError({ code: "CONFLICT", message: "ALREADY_INITIALIZED" });
          // Every new agency starts on a trial; the platform owner chooses the plan and length.
          const plan = process.env.TRIAL_PLAN ?? "premium";
          const days = Number(process.env.TRIAL_DAYS ?? 30);
          await tx.execute(sql`select start_trial(${plan}, ${days})`);
          return row;
        },
      );
    }),

  /** The caller's role in the active agency, for showing or hiding restricted actions. */
  me: tenantProcedure.query(async ({ ctx }) => ({
    role: ctx.role,
    tenantId: ctx.tenantId,
    shops: (await unitAccess(ctx.tx, ctx.role, ctx.session.userId)).shops,
  })),

  /** The agency's plan and whether it can still make changes. */
  subscription: tenantProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.tx
      .select({
        status: subscriptions.status,
        cycle: subscriptions.cycle,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        planNameBn: plans.nameBn,
        planNameEn: plans.nameEn,
        limits: plans.limits,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .limit(1);
    return row ? { ...row, inactive: subscriptionInactive(row) } : null;
  }),

  settings: tenantProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.tx.select().from(tenantSettings).limit(1);
    return row ?? null;
  }),

  updateSettings: withRoles("admin")
    .input(settingsInput.partial())
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .update(tenantSettings)
        .set(input)
        .where(eq(tenantSettings.tenantId, ctx.tenantId))
        .returning();
      return row;
    }),

  setExchangeRate: withRoles("admin", "accountant")
    .input(
      z.object({
        effectiveOn: z.iso.date(),
        rate: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let rate: number;
      try {
        rate = parseRate(input.rate);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_RATE" });
      }
      const values = {
        effectiveOn: input.effectiveOn,
        base: "SAR" as const,
        quote: "BDT" as const,
        rate,
      };
      const [row] = await ctx.tx
        .insert(exchangeRates)
        .values(values)
        .onConflictDoUpdate({
          target: [
            exchangeRates.tenantId,
            exchangeRates.effectiveOn,
            exchangeRates.base,
            exchangeRates.quote,
          ],
          set: { rate },
        })
        .returning();
      return row;
    }),

  latestExchangeRate: tenantProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.tx
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.base, "SAR"), eq(exchangeRates.quote, "BDT")))
      .orderBy(desc(exchangeRates.effectiveOn))
      .limit(1);
    return row ?? null;
  }),
});
