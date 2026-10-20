import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { session, trustedDevices, user } from "@hajj/db/schema";
import { platformProcedure, protectedProcedure, router } from "../trpc";
import { containing } from "./shared";

/** The browser cookie holds a random token; the table holds its SHA-256. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const columns = {
  id: trustedDevices.id,
  label: trustedDevices.label,
  deviceType: trustedDevices.deviceType,
  browser: trustedDevices.browser,
  os: trustedDevices.os,
  ip: trustedDevices.ip,
  createdAt: trustedDevices.createdAt,
  lastSeenAt: trustedDevices.lastSeenAt,
  expiresAt: trustedDevices.expiresAt,
  tokenHash: trustedDevices.tokenHash,
};

const active = () => and(isNull(trustedDevices.revokedAt), gt(trustedDevices.expiresAt, new Date()));

export const accountRouter = router({
  /** Devices that can sign in to this account without a code. `current` is this browser's token, if it has one. */
  devices: protectedProcedure.input(z.object({ current: z.string().max(200).optional() }).optional()).query(async ({ ctx, input }) => {
    const mine = input?.current ? hashToken(input.current) : null;
    const rows = await ctx.db
      .select(columns)
      .from(trustedDevices)
      .where(and(eq(trustedDevices.userId, ctx.session.userId), active()))
      .orderBy(desc(trustedDevices.lastSeenAt));
    const [sessions] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(session)
      .where(and(eq(session.userId, ctx.session.userId), gt(session.expiresAt, new Date())));
    return {
      devices: rows.map(({ tokenHash, ...d }) => ({ ...d, current: tokenHash === mine })),
      openSessions: sessions?.n ?? 0,
    };
  }),

  revokeDevice: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(trustedDevices)
      .set({ revokedAt: new Date() })
      .where(and(eq(trustedDevices.id, input.id), eq(trustedDevices.userId, ctx.session.userId), isNull(trustedDevices.revokedAt)))
      .returning({ id: trustedDevices.id });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  /* ------------------------------------------------------ platform owner */

  allDevices: platformProcedure.input(z.object({ q: z.string().trim().max(120).optional() }).optional()).query(async ({ ctx, input }) => {
    const needle = input?.q ? containing(input.q) : null;
    return ctx.tx
      .select({
        id: trustedDevices.id,
        label: trustedDevices.label,
        ip: trustedDevices.ip,
        createdAt: trustedDevices.createdAt,
        lastSeenAt: trustedDevices.lastSeenAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(trustedDevices)
      .innerJoin(user, eq(user.id, trustedDevices.userId))
      .where(and(active(), needle ? or(sql`${user.email} ilike ${needle}`, sql`${user.name} ilike ${needle}`) : undefined))
      .orderBy(desc(trustedDevices.lastSeenAt))
      .limit(300);
  }),

  adminRevokeDevice: platformProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .update(trustedDevices)
      .set({ revokedAt: new Date() })
      .where(and(eq(trustedDevices.id, input.id), isNull(trustedDevices.revokedAt)))
      .returning({ id: trustedDevices.id });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),
});
