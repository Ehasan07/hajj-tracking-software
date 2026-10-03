import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  BUSINESS_UNITS,
  parseAmount,
  periodRange,
  type BusinessUnit,
  type Currency,
} from "@hajj/core";
import { expenses, ledgerEntries } from "@hajj/db/schema";
import { recordExpense, voidExpense } from "../services/money-out";
import { businessDate, entryDate, getSettings } from "../services/tenant";
import { router, withRoles } from "../trpc";
import { amountInput, dateKey, optionalText, paymentMethods } from "./shared";

const inSum =
  sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'in'), 0)::bigint`.mapWith(
    Number,
  );
const outSum =
  sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'out'), 0)::bigint`.mapWith(
    Number,
  );

interface Flow {
  in: number;
  out: number;
  net: number;
  count: number;
}

const books = withRoles("admin", "accountant");

export const statementsRouter = router({
  /**
   * A statement for a day ("2026-10-03"), a month ("2026-10") or a year
   * ("2026"), straight from the ledger. Nothing has to be closed or run: the
   * ledger is append-only and a cancellation is a new entry on the day it
   * happened, so a past day's statement never changes once the day is over.
   */
  summary: books
    .input(z.object({ key: z.string().trim().max(10), unit: z.enum(BUSINESS_UNITS).optional() }))
    .query(async ({ ctx, input }) => {
      let range;
      try {
        range = periodRange(input.key);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_PERIOD" });
      }
      const settings = await getSettings(ctx.tx);
      const unitFilter = input.unit ? eq(ledgerEntries.unit, input.unit) : undefined;
      const inRange = and(
        gte(ledgerEntries.businessDate, range.from),
        lte(ledgerEntries.businessDate, range.to),
        unitFilter,
      );

      const bucket =
        range.period === "year"
          ? sql<string>`to_char(${ledgerEntries.businessDate}, 'YYYY-MM')`
          : sql<string>`${ledgerEntries.businessDate}::text`;

      const [openingRows, byUnit, byCategory, buckets] = await Promise.all([
        ctx.tx
          .select({ currency: ledgerEntries.currency, in: inSum, out: outSum })
          .from(ledgerEntries)
          .where(and(lt(ledgerEntries.businessDate, range.from), unitFilter))
          .groupBy(ledgerEntries.currency),
        ctx.tx
          .select({
            unit: ledgerEntries.unit,
            currency: ledgerEntries.currency,
            in: inSum,
            out: outSum,
            count: sql<number>`count(*)::int`,
          })
          .from(ledgerEntries)
          .where(inRange)
          .groupBy(ledgerEntries.unit, ledgerEntries.currency),
        ctx.tx
          .select({
            sourceType: ledgerEntries.sourceType,
            category: ledgerEntries.category,
            direction: ledgerEntries.direction,
            currency: ledgerEntries.currency,
            total: sql<number>`sum(${ledgerEntries.amount})::bigint`.mapWith(Number),
            count: sql<number>`count(*)::int`,
          })
          .from(ledgerEntries)
          .where(inRange)
          .groupBy(
            ledgerEntries.sourceType,
            ledgerEntries.category,
            ledgerEntries.direction,
            ledgerEntries.currency,
          )
          .orderBy(desc(sql`sum(${ledgerEntries.amount})`)),
        range.period === "day"
          ? Promise.resolve([])
          : ctx.tx
              .select({
                bucket,
                currency: ledgerEntries.currency,
                in: inSum,
                out: outSum,
                count: sql<number>`count(*)::int`,
              })
              .from(ledgerEntries)
              .where(inRange)
              .groupBy(bucket, ledgerEntries.currency)
              .orderBy(asc(bucket)),
      ]);

      const entries =
        range.period === "day"
          ? await ctx.tx
              .select({
                id: ledgerEntries.id,
                unit: ledgerEntries.unit,
                direction: ledgerEntries.direction,
                amount: ledgerEntries.amount,
                currency: ledgerEntries.currency,
                occurredAt: ledgerEntries.occurredAt,
                sourceType: ledgerEntries.sourceType,
                sourceId: ledgerEntries.sourceId,
                category: ledgerEntries.category,
                memo: ledgerEntries.memo,
              })
              .from(ledgerEntries)
              .where(inRange)
              .orderBy(asc(ledgerEntries.occurredAt))
          : [];

      const currencies = [
        ...new Set<Currency>([
          "BDT",
          ...openingRows.map((r) => r.currency),
          ...byUnit.map((r) => r.currency),
        ]),
      ];
      const perCurrency = currencies.map((currency) => {
        const o = openingRows.find((r) => r.currency === currency);
        const opening = o ? o.in - o.out : 0;
        const units = byUnit.filter((r) => r.currency === currency);
        const totals: Flow = units.reduce(
          (a, r) => ({
            in: a.in + r.in,
            out: a.out + r.out,
            net: a.net + r.in - r.out,
            count: a.count + r.count,
          }),
          {
            in: 0,
            out: 0,
            net: 0,
            count: 0,
          },
        );
        // Running balance through the sub-periods (days of a month, months of a year).
        let running = opening;
        const rows = buckets
          .filter((b) => b.currency === currency)
          .map((b) => {
            const openingBalance = running;
            running += b.in - b.out;
            return {
              period: b.bucket,
              in: b.in,
              out: b.out,
              net: b.in - b.out,
              count: b.count,
              openingBalance,
              closingBalance: running,
            };
          });
        return {
          currency,
          opening,
          closing: opening + totals.net,
          totals,
          byUnit: Object.fromEntries(
            units.map((r) => [r.unit, { in: r.in, out: r.out, net: r.in - r.out, count: r.count }]),
          ) as Partial<Record<BusinessUnit, Flow>>,
          rows,
        };
      });

      return {
        key: input.key,
        unit: input.unit ?? null,
        ...range,
        today: businessDate(settings),
        agency: settings.legalName,
        currencies: perCurrency,
        byCategory,
        entries,
      };
    }),

  /** Days of a month that have entries, for the calendar strip. */
  activeDays: books
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const range = periodRange(input.month);
      const rows = await ctx.tx
        .select({
          day: sql<string>`${ledgerEntries.businessDate}::text`,
          net: sql<number>`sum(case when ${ledgerEntries.direction} = 'in' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end)::bigint`.mapWith(
            Number,
          ),
        })
        .from(ledgerEntries)
        .where(
          and(
            gte(ledgerEntries.businessDate, range.from),
            lte(ledgerEntries.businessDate, range.to),
            eq(ledgerEntries.currency, "BDT"),
          ),
        )
        .groupBy(ledgerEntries.businessDate);
      return rows;
    }),
});

const EXPENSE_UNITS = BUSINESS_UNITS;

export const expensesRouter = router({
  create: books
    .input(
      z.object({
        unit: z.enum(EXPENSE_UNITS).default("office"),
        category: z.string().trim().min(1).max(60),
        payee: optionalText(120),
        amount: amountInput,
        currency: z.enum(["BDT", "SAR"]).default("BDT"),
        method: z.enum(paymentMethods),
        reference: optionalText(80),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const row = await recordExpense(ctx.tx, {
        ...input,
        amount: parseAmount(input.amount),
        day: entryDate(settings, ctx.role, input.date),
      });
      return { id: row.id };
    }),

  void: books
    .input(z.object({ id: z.uuid(), reason: z.string().trim().min(4).max(300) }))
    .mutation(({ ctx, input }) => voidExpense(ctx.tx, input.id, input.reason)),

  list: books
    .input(
      z.object({
        from: dateKey,
        to: dateKey,
        unit: z.enum(EXPENSE_UNITS).optional(),
        includeVoid: z.boolean().default(true),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.tx
        .select()
        .from(expenses)
        .where(
          and(
            gte(expenses.businessDate, input.from),
            lte(expenses.businessDate, input.to),
            input.unit ? eq(expenses.unit, input.unit) : undefined,
            input.includeVoid ? undefined : isNull(expenses.voidedAt),
          ),
        )
        .orderBy(desc(expenses.spentAt))
        .limit(300),
    ),
});
