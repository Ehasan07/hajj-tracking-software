import { TRPCError } from "@trpc/server";
import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { BUSINESS_UNITS, parseAmount } from "@hajj/core";
import { withActor } from "@hajj/db";
import { plans } from "@hajj/db/schema";
import { platformProcedure, protectedProcedure, router } from "../trpc";

export interface PlatformOverview {
  agencies: number;
  byStatus: Partial<Record<"trial" | "active" | "past_due" | "suspended" | "cancelled" | "none", number>>;
  trialsEndingSoon: number;
  trialsExpired: number;
  mrr: number;
  collectionsThisMonth: number;
  pilgrims: number;
  pilgrimsThisYear: number;
  newAgencies30d: number;
  signupsByMonth: { month: string; n: number }[];
}

export interface PlatformAgency {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  public_host: string | null;
  enabled_units: string[];
  owner: { name: string; email: string } | null;
  plan_code: string | null;
  plan_name_bn: string | null;
  plan_name_en: string | null;
  status: "trial" | "active" | "past_due" | "suspended" | "cancelled" | null;
  cycle: "monthly" | "yearly" | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  pilgrims: number;
  staff: number;
  collections_this_month: number;
  last_activity: string | null;
}

/** Postgres errors raised by the platform functions carry our code in the message. */
function rethrow(error: unknown): never {
  const message = String((error as { cause?: { message?: string } }).cause?.message ?? (error as Error).message);
  if (message.includes("FORBIDDEN")) throw new TRPCError({ code: "FORBIDDEN" });
  throw error;
}

const statuses = ["trial", "active", "past_due", "suspended", "cancelled"] as const;

export const platformRouter = router({
  /** Whether the signed-in user operates the platform. Safe to call for anyone signed in. */
  me: protectedProcedure.query(async ({ ctx }) =>
    withActor(ctx.db, ctx.session.userId, async (tx) => {
      const [row] = await tx.execute<{ ok: boolean }>(sql`select is_platform_admin() as ok`);
      return { isAdmin: Boolean(row?.ok) };
    }),
  ),

  overview: platformProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.tx.execute<{ data: PlatformOverview }>(sql`select platform_overview() as data`).catch(rethrow);
    const d = row!.data;
    return { ...d, mrr: Number(d.mrr), collectionsThisMonth: Number(d.collectionsThisMonth) };
  }),

  agencies: platformProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.tx.execute<{ data: PlatformAgency[] }>(sql`select platform_agencies() as data`).catch(rethrow);
    return row!.data.map((a) => ({ ...a, collections_this_month: Number(a.collections_this_month) }));
  }),

  plans: platformProcedure.query(({ ctx }) => ctx.tx.select().from(plans).orderBy(asc(plans.sortOrder))),

  setSubscription: platformProcedure
    .input(
      z.object({
        tenantId: z.string().min(1),
        planId: z.uuid(),
        status: z.enum(statuses),
        cycle: z.enum(["monthly", "yearly"]),
        trialEndsAt: z.iso.date().nullable(),
        currentPeriodEnd: z.iso.date().nullable(),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // End of day in Dhaka, so "trial ends 30 Oct" lasts the whole of 30 Oct.
      const endOfDay = (d: string | null) => (d ? `${d}T23:59:59+06:00` : null);
      await ctx.tx
        .execute(
          sql`select platform_set_subscription(${input.tenantId}, ${input.planId}::uuid, ${input.status}::subscription_status,
            ${input.cycle}::billing_cycle, ${endOfDay(input.trialEndsAt)}::timestamptz, ${endOfDay(input.currentPeriodEnd)}::timestamptz,
            ${input.notes ?? null})`,
        )
        .catch(rethrow);
      return { ok: true };
    }),

  setUnits: platformProcedure
    .input(z.object({ tenantId: z.string().min(1), units: z.array(z.enum(BUSINESS_UNITS)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const units = `{${input.units.join(",")}}`;
      await ctx.tx.execute(sql`select platform_set_units(${input.tenantId}, ${units}::business_unit[])`).catch(rethrow);
      return { ok: true };
    }),

  savePlan: platformProcedure
    .input(
      z.object({
        id: z.uuid().optional(),
        code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,30}$/),
        nameBn: z.string().trim().min(1).max(60),
        nameEn: z.string().trim().min(1).max(60),
        taglineBn: z.string().trim().max(200).default(""),
        taglineEn: z.string().trim().max(200).default(""),
        priceMonthly: z.string(),
        priceYearly: z.string(),
        pilgrimsPerYear: z.number().int().positive().nullable(),
        staffSeats: z.number().int().positive().nullable(),
        smsPerMonth: z.number().int().min(0).nullable(),
        units: z.array(z.enum(BUSINESS_UNITS)).min(1),
        customDomain: z.boolean(),
        sortOrder: z.number().int().min(0).max(1000),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const limits = JSON.stringify({ pilgrimsPerYear: input.pilgrimsPerYear, staffSeats: input.staffSeats, smsPerMonth: input.smsPerMonth });
      const units = `{${input.units.join(",")}}`;
      const [row] = await ctx.tx
        .execute<{ id: string }>(
          sql`select platform_save_plan(${input.id ?? null}::uuid, ${input.code}, ${input.nameBn}, ${input.nameEn},
            ${input.taglineBn}, ${input.taglineEn}, ${parseAmount(input.priceMonthly)}, ${parseAmount(input.priceYearly)},
            ${limits}::jsonb, ${units}::business_unit[], ${input.customDomain}, ${input.sortOrder}, ${input.active}) as id`,
        )
        .catch(rethrow);
      return { id: row!.id };
    }),
});
