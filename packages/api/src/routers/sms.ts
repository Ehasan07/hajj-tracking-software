import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNotNull, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { SMS_MAX_LENGTH, smsSize } from "@hajj/core";
import { pilgrimStatusEnum, pilgrims, smsMessages, tenantSettings } from "@hajj/db/schema";
import { enqueueSms, smsAvailable, smsQuota } from "../services/sms";
import { router, withRoles } from "../trpc";

/** Owners and admins send notices and change SMS settings. */
const managers = withRoles("admin");

const audienceInput = z.object({
  /** all: everyone not cancelled; package: one package; status: one stage of the journey. */
  group: z.enum(["all", "package", "status"]),
  packageId: z.uuid().optional(),
  status: z.enum(pilgrimStatusEnum.enumValues).optional(),
});

type Audience = z.infer<typeof audienceInput>;

function audienceWhere(a: Audience) {
  const base = ne(pilgrims.status, "cancelled");
  if (a.group === "package") {
    if (!a.packageId) throw new TRPCError({ code: "BAD_REQUEST", message: "PACKAGE_REQUIRED" });
    return and(base, eq(pilgrims.packageId, a.packageId));
  }
  if (a.group === "status") {
    if (!a.status) throw new TRPCError({ code: "BAD_REQUEST" });
    return eq(pilgrims.status, a.status);
  }
  return base;
}

export const smsRouter = router({
  /** The SMS page: is SMS on, how much of the month's allowance is left, receipt texts on or off, recent sends. */
  overview: managers.query(async ({ ctx }) => {
    const [quota, [settings], batches, receipts] = await Promise.all([
      smsQuota(ctx.tx),
      ctx.tx.select({ smsReceipts: tenantSettings.smsReceipts }).from(tenantSettings).limit(1),
      ctx.tx
        .select({
          batchId: smsMessages.batchId,
          body: max(smsMessages.body),
          parts: max(smsMessages.parts),
          at: max(smsMessages.createdAt),
          total: count(),
          sent: sql<number>`count(*) filter (where ${smsMessages.status} = 'sent')::int`,
          failed: sql<number>`count(*) filter (where ${smsMessages.status} in ('failed', 'expired'))::int`,
          skipped: sql<number>`count(*) filter (where ${smsMessages.status} = 'skipped')::int`,
        })
        .from(smsMessages)
        .where(and(eq(smsMessages.kind, "notice"), isNotNull(smsMessages.batchId)))
        .groupBy(smsMessages.batchId)
        .orderBy(desc(max(smsMessages.createdAt)))
        .limit(20),
      ctx.tx
        .select({ id: smsMessages.id, toPhone: smsMessages.toPhone, body: smsMessages.body, status: smsMessages.status, error: smsMessages.error, createdAt: smsMessages.createdAt })
        .from(smsMessages)
        .where(eq(smsMessages.kind, "receipt"))
        .orderBy(desc(smsMessages.createdAt))
        .limit(15),
    ]);
    return { available: smsAvailable(), quota, smsReceipts: settings?.smsReceipts ?? true, batches, receipts };
  }),

  /** How many different numbers a notice would reach. */
  audience: managers.input(audienceInput).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx.select({ n: sql<number>`count(distinct ${pilgrims.phone})::int` }).from(pilgrims).where(audienceWhere(input));
    return { recipients: row?.n ?? 0 };
  }),

  /** Text a group of pilgrims, one message per number. Refused whole if the month's allowance can't cover it. */
  sendNotice: managers
    .input(audienceInput.extend({ text: z.string().trim().min(5).max(SMS_MAX_LENGTH) }))
    .mutation(async ({ ctx, input }) => {
      if (!smsAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMS_OFF" });
      const rows = await ctx.tx.selectDistinct({ phone: pilgrims.phone }).from(pilgrims).where(audienceWhere(input));
      const phones = rows.map((r) => r.phone).filter(Boolean);
      if (phones.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "NO_RECIPIENTS" });
      const parts = smsSize(input.text).parts;
      const { remaining } = await smsQuota(ctx.tx);
      if (remaining != null && remaining < parts * phones.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `SMS_LIMIT:${remaining}` });
      }
      const batchId = randomUUID();
      const result = await enqueueSms(
        ctx.tx,
        phones.map((toPhone) => ({ kind: "notice" as const, toPhone, body: input.text, batchId })),
      );
      return { batchId, recipients: phones.length, parts, ...result };
    }),

  setReceipts: managers.input(z.object({ on: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.update(tenantSettings).set({ smsReceipts: input.on }).where(eq(tenantSettings.tenantId, ctx.tenantId));
    return { ok: true };
  }),
});
