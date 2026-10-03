import { initTRPC, TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";
import { db, withActor, withTenant, type Database, type Transaction } from "@hajj/db";
import { member, subscriptions } from "@hajj/db/schema";

/** "alim" is the agency's scholar, who approves religious content. */
export const ROLES = ["owner", "admin", "accountant", "staff", "shop_operator", "alim"] as const;
export type Role = (typeof ROLES)[number];

export interface SessionInfo {
  userId: string;
  activeOrganizationId: string | null;
}

export interface Context {
  db: Database;
  session: SessionInfo | null;
  /** Client IP, used for rate limiting and audit context. */
  ip: string | null;
}

export function createContext(input: { session: SessionInfo | null; ip?: string | null }): Context {
  return { db, session: input.session, ip: input.ip ?? null };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Never send stack traces to clients.
        stack: undefined,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Resolves the caller's membership in their active agency and runs the whole
 * procedure inside one tenant-scoped transaction. Any error rolls back.
 */
/** A subscription that no longer allows changes: suspended, cancelled, unpaid, or a trial past its end. */
export function subscriptionInactive(
  sub: { status: string; trialEndsAt: Date | null } | undefined,
  now = new Date(),
) {
  if (!sub) return false;
  if (sub.status === "trial") return sub.trialEndsAt !== null && sub.trialEndsAt < now;
  return sub.status !== "active";
}

/** What a shop-only login may call. Everything else (pilgrims, money, payroll...) is closed to it. */
const SHOP_OPERATOR_PATHS = ["shop.", "tenant.me", "tenant.settings", "tenant.subscription"];

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next, type, path }) => {
  const tenantId = ctx.session.activeOrganizationId;
  if (!tenantId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "NO_ACTIVE_AGENCY" });

  const [membership] = await ctx.db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, ctx.session.userId), eq(member.organizationId, tenantId)))
    .limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

  const role = membership.role as Role;
  if (
    role === "shop_operator" &&
    !SHOP_OPERATOR_PATHS.some((p) => (p.endsWith(".") ? path.startsWith(p) : path === p))
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return withTenant(ctx.db, { tenantId, userId: ctx.session.userId }, async (tx: Transaction) => {
    // An agency whose subscription has lapsed can still read everything, but change nothing.
    if (type === "mutation") {
      const [sub] = await tx
        .select({ status: subscriptions.status, trialEndsAt: subscriptions.trialEndsAt })
        .from(subscriptions)
        .limit(1);
      if (subscriptionInactive(sub))
        throw new TRPCError({ code: "FORBIDDEN", message: "SUBSCRIPTION_INACTIVE" });
    }
    const result = await next({ ctx: { ...ctx, tx, tenantId, role } });
    // tRPC captures errors into the result; rethrow so the transaction rolls back.
    if (!result.ok) throw result.error;
    return result;
  });
});

/** Restrict a tenant procedure to some roles. Owners always pass. */
export function withRoles(...allowed: Role[]) {
  return tenantProcedure.use(({ ctx, next }) => {
    if (ctx.role !== "owner" && !allowed.includes(ctx.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next();
  });
}

/** Platform owner's procedures. Every read and write also goes through functions that re-check this. */
export const platformProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  return withActor(ctx.db, ctx.session.userId, async (tx) => {
    const [row] = await tx.execute<{ ok: boolean }>(sql`select is_platform_admin() as ok`);
    if (!row?.ok) throw new TRPCError({ code: "FORBIDDEN" });
    const result = await next({ ctx: { ...ctx, tx } });
    if (!result.ok) throw result.error;
    return result;
  });
});
