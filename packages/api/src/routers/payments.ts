import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { outstanding, parseAmount } from "@hajj/core";
import { ledgerEntries, payments, pilgrims, tenantSettings, travelPackages } from "@hajj/db/schema";
import { randomToken } from "../crypto";
import { businessDate, getSettings, nextReference } from "../services/tenant";
import { router, tenantProcedure, withRoles } from "../trpc";
import { amountInput, optionalText } from "./shared";

const methods = ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"] as const;

export const paymentsRouter = router({
  /**
   * Receive money from a pilgrim. In one transaction: lock the pilgrim row,
   * check the amount against what is still due, take the next receipt number,
   * write the ledger entry and the payment. Concurrent payments for the same
   * pilgrim queue on the row lock, so the due check can't be raced.
   */
  receive: tenantProcedure
    .input(
      z.object({
        pilgrimId: z.uuid(),
        amount: amountInput,
        method: z.enum(methods),
        reference: optionalText(80),
        purpose: optionalText(200),
        allowOverpayment: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [pilgrim] = await ctx.tx
        .select({
          id: pilgrims.id,
          price: pilgrims.packagePrice,
          discount: pilgrims.discount,
          currency: pilgrims.currency,
          status: pilgrims.status,
        })
        .from(pilgrims)
        .where(eq(pilgrims.id, input.pilgrimId))
        .for("update");
      if (!pilgrim) throw new TRPCError({ code: "NOT_FOUND" });
      if (pilgrim.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "PILGRIM_CANCELLED" });
      if (input.method !== "cash" && !input.reference) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "REFERENCE_REQUIRED" });
      }

      const amount = parseAmount(input.amount);
      const previous = await ctx.tx
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.pilgrimId, pilgrim.id), isNull(payments.voidedAt)));
      const before = outstanding(pilgrim.price, previous.map((p) => p.amount), [pilgrim.discount]);
      if (amount > before.due && !input.allowOverpayment) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `OVERPAYMENT:${before.due}` });
      }

      const settings = await getSettings(ctx.tx);
      const now = new Date();
      const day = businessDate(settings, now);
      const receiptNo = await nextReference(ctx.tx, settings, "receipt", now);
      const paymentId = randomUUID();

      const [entry] = await ctx.tx
        .insert(ledgerEntries)
        .values({
          unit: "hajj",
          direction: "in",
          amount,
          currency: pilgrim.currency,
          businessDate: day,
          occurredAt: now,
          sourceType: "pilgrim_payment",
          sourceId: paymentId,
          category: input.method,
          memo: receiptNo,
        })
        .returning({ id: ledgerEntries.id });

      const [payment] = await ctx.tx
        .insert(payments)
        .values({
          id: paymentId,
          receiptNo,
          pilgrimId: pilgrim.id,
          amount,
          currency: pilgrim.currency,
          method: input.method,
          reference: input.reference,
          purpose: input.purpose,
          receivedAt: now,
          businessDate: day,
          ledgerEntryId: entry!.id,
          verifyToken: randomToken(),
        })
        .returning({ id: payments.id, receiptNo: payments.receiptNo });

      if (pilgrim.status === "registered" && before.paid === 0) {
        await ctx.tx.update(pilgrims).set({ status: "documents" }).where(eq(pilgrims.id, pilgrim.id));
      }

      const after = outstanding(pilgrim.price, [...previous.map((p) => p.amount), amount], [pilgrim.discount]);
      return { ...payment!, totals: after };
    }),

  /** Cancel a receipt. Keeps the row, posts a reversing ledger entry. Accountants and admins only. */
  void: withRoles("admin", "accountant")
    .input(z.object({ id: z.uuid(), reason: z.string().trim().min(4).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const [payment] = await ctx.tx.select().from(payments).where(eq(payments.id, input.id)).for("update");
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      if (payment.voidedAt) throw new TRPCError({ code: "CONFLICT", message: "ALREADY_VOID" });

      const settings = await getSettings(ctx.tx);
      const now = new Date();
      const [reversal] = await ctx.tx
        .insert(ledgerEntries)
        .values({
          unit: "hajj",
          direction: "out",
          amount: payment.amount,
          currency: payment.currency,
          businessDate: businessDate(settings, now),
          occurredAt: now,
          sourceType: "pilgrim_payment_void",
          sourceId: payment.id,
          category: payment.method,
          memo: `VOID ${payment.receiptNo}: ${input.reason}`,
          reversesId: payment.ledgerEntryId,
        })
        .returning({ id: ledgerEntries.id });

      await ctx.tx
        .update(payments)
        .set({ voidedAt: now, voidedBy: ctx.session.userId, voidReason: input.reason, voidLedgerEntryId: reversal!.id })
        .where(eq(payments.id, payment.id));
      return { id: payment.id };
    }),

  /** Everything the printed receipt needs. */
  receipt: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({
        payment: payments,
        pilgrim: {
          id: pilgrims.id,
          ref: pilgrims.ref,
          fullName: pilgrims.fullName,
          phone: pilgrims.phone,
          packagePrice: pilgrims.packagePrice,
          discount: pilgrims.discount,
        },
        packageName: travelPackages.name,
        packageSeason: travelPackages.season,
        agency: tenantSettings,
      })
      .from(payments)
      .innerJoin(pilgrims, eq(pilgrims.id, payments.pilgrimId))
      .leftJoin(travelPackages, eq(travelPackages.id, pilgrims.packageId))
      .innerJoin(tenantSettings, eq(tenantSettings.tenantId, payments.tenantId))
      .where(eq(payments.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });

    // Totals as of this receipt: payments received up to and including it.
    const upTo = await ctx.tx
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.pilgrimId, row.pilgrim.id),
          isNull(payments.voidedAt),
          lte(payments.receivedAt, row.payment.receivedAt),
        ),
      );
    const totals = outstanding(row.pilgrim.packagePrice, upTo.map((p) => p.amount), [row.pilgrim.discount]);
    return { ...row, totals };
  }),

  recent: tenantProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(8) }).optional())
    .query(({ ctx, input }) =>
      ctx.tx
        .select({
          id: payments.id,
          receiptNo: payments.receiptNo,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          receivedAt: payments.receivedAt,
          voidedAt: payments.voidedAt,
          pilgrimId: pilgrims.id,
          pilgrimRef: pilgrims.ref,
          pilgrimName: pilgrims.fullName,
        })
        .from(payments)
        .innerJoin(pilgrims, eq(pilgrims.id, payments.pilgrimId))
        .orderBy(desc(payments.receivedAt))
        .limit(input?.limit ?? 8),
    ),

  /** Today's money for the dashboard, split by method. Voided receipts excluded. */
  today: tenantProcedure.query(async ({ ctx }) => {
    const settings = await getSettings(ctx.tx);
    const day = businessDate(settings);
    const rows = await ctx.tx
      .select({
        method: payments.method,
        currency: payments.currency,
        total: sql<number>`sum(${payments.amount})::bigint`.mapWith(Number),
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(and(eq(payments.businessDate, day), isNull(payments.voidedAt)))
      .groupBy(payments.method, payments.currency);
    const bdt = rows.filter((r) => r.currency === "BDT");
    return {
      day,
      total: bdt.reduce((a, r) => a + r.total, 0),
      count: rows.reduce((a, r) => a + r.count, 0),
      byMethod: Object.fromEntries(bdt.map((r) => [r.method, r.total])) as Partial<Record<(typeof methods)[number], number>>,
    };
  }),
});
