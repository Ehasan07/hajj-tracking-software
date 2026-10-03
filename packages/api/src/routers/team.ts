import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { BUSINESS_UNITS, SHOP_UNITS } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import {
  account,
  member,
  memberUnits,
  plans,
  subscriptions,
  tenantSettings,
  user,
} from "@hajj/db/schema";
import { router, withRoles } from "../trpc";

const ASSIGNABLE = ["admin", "accountant", "staff", "shop_operator", "alim"] as const;
const managers = withRoles("admin");

async function seatCheck(tx: Transaction, tenantId: string) {
  const [plan] = await tx
    .select({ limits: plans.limits })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .limit(1);
  const seats = plan?.limits.staffSeats ?? null;
  if (seats === null) return;
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(member)
    .where(eq(member.organizationId, tenantId));
  if ((row?.n ?? 0) >= seats)
    throw new TRPCError({ code: "FORBIDDEN", message: `SEAT_LIMIT:${seats}` });
}

export const teamRouter = router({
  members: managers.query(async ({ ctx }) => {
    const rows = await ctx.tx
      .select({
        id: member.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, ctx.tenantId))
      .orderBy(asc(member.createdAt));
    const units = await ctx.tx.select().from(memberUnits);
    return rows.map((r) => ({
      ...r,
      units: units.find((u) => u.userId === r.userId)?.units ?? [],
      self: r.userId === ctx.session.userId,
    }));
  }),

  /**
   * Make a login for a colleague, e.g. one that opens only the medicine shop.
   * The owner hands the email and password over in person; the colleague can
   * change the password after signing in.
   */
  create: managers
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.email().transform((v) => v.toLowerCase()),
        password: z.string().min(10, "WEAK_PASSWORD").max(128),
        role: z.enum(ASSIGNABLE),
        units: z.array(z.enum(SHOP_UNITS)).max(4).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === "admin" && ctx.role !== "owner")
        throw new TRPCError({ code: "FORBIDDEN" });
      if (input.role === "shop_operator" && input.units.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "UNITS_REQUIRED" });
      await seatCheck(ctx.tx, ctx.tenantId);

      const [taken] = await ctx.tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, input.email));
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "EMAIL_TAKEN" });

      const userId = randomUUID();
      const now = new Date();
      await ctx.tx
        .insert(user)
        .values({
          id: userId,
          name: input.name,
          email: input.email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        });
      await ctx.tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(input.password),
        createdAt: now,
        updatedAt: now,
      });
      await ctx.tx
        .insert(member)
        .values({
          id: randomUUID(),
          organizationId: ctx.tenantId,
          userId,
          role: input.role,
          createdAt: now,
        });
      if (input.role === "shop_operator")
        await ctx.tx.insert(memberUnits).values({ userId, units: input.units });
      return { userId };
    }),

  update: managers
    .input(
      z.object({
        memberId: z.string().min(1),
        role: z.enum(ASSIGNABLE),
        units: z.array(z.enum(SHOP_UNITS)).max(4).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.tx
        .select()
        .from(member)
        .where(and(eq(member.id, input.memberId), eq(member.organizationId, ctx.tenantId)));
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "owner" || target.userId === ctx.session.userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "CANNOT_CHANGE_OWNER" });
      if ((input.role === "admin" || target.role === "admin") && ctx.role !== "owner")
        throw new TRPCError({ code: "FORBIDDEN" });
      if (input.role === "shop_operator" && input.units.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "UNITS_REQUIRED" });
      await ctx.tx.update(member).set({ role: input.role }).where(eq(member.id, target.id));
      await ctx.tx.delete(memberUnits).where(eq(memberUnits.userId, target.userId));
      if (input.role === "shop_operator")
        await ctx.tx.insert(memberUnits).values({ userId: target.userId, units: input.units });
      return { ok: true };
    }),

  /** Take away a colleague's access to this agency. Their sessions stop working on the next request. */
  remove: managers
    .input(z.object({ memberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.tx
        .select()
        .from(member)
        .where(and(eq(member.id, input.memberId), eq(member.organizationId, ctx.tenantId)));
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "owner" || target.userId === ctx.session.userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "CANNOT_CHANGE_OWNER" });
      if (target.role === "admin" && ctx.role !== "owner")
        throw new TRPCError({ code: "FORBIDDEN" });
      await ctx.tx.delete(memberUnits).where(eq(memberUnits.userId, target.userId));
      await ctx.tx.delete(member).where(eq(member.id, target.id));
      return { ok: true };
    }),

  /** Turn businesses on or off for the agency, within what the plan includes. */
  setUnits: managers
    .input(z.object({ units: z.array(z.enum(BUSINESS_UNITS)) }))
    .mutation(async ({ ctx, input }) => {
      const [plan] = await ctx.tx
        .select({ units: plans.units })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .limit(1);
      const wanted = [
        ...new Set<(typeof BUSINESS_UNITS)[number]>(["hajj", "office", ...input.units]),
      ];
      if (plan && wanted.some((u) => !plan.units.includes(u)))
        throw new TRPCError({ code: "FORBIDDEN", message: "UNIT_NOT_IN_PLAN" });
      await ctx.tx.update(tenantSettings).set({ enabledUnits: wanted });
      return { units: wanted };
    }),
});
