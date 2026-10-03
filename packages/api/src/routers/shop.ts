import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  addDays,
  parseAmount,
  pickBatches,
  saleTotals,
  SHOP_UNITS,
  weekdayOf,
  type IdKind,
  type ShopUnit,
} from "@hajj/core";
import {
  customerPayments,
  customers,
  expenses,
  ledgerEntries,
  productBatches,
  products,
  routes,
  saleItems,
  sales,
  stockMovements,
  tenantSettings,
} from "@hajj/db/schema";
import { recordExpense, voidExpense } from "../services/money-out";
import { businessDate, entryDate, getSettings, nextReference } from "../services/tenant";
import { assertShop, unitAccess } from "../services/units";
import { router, tenantProcedure } from "../trpc";
import { amountInput, amountOrZero, dateKey, optionalText, paymentMethods } from "./shared";

/** Every shop procedure names its unit; access to that shop is checked before anything runs. */
const shopProcedure = tenantProcedure
  .input(z.object({ unit: z.enum(SHOP_UNITS) }))
  .use(async ({ ctx, input, next }) => {
    await assertShop(ctx.tx, ctx.role, ctx.session.userId, input.unit);
    return next();
  });

const MANAGERS = ["owner", "admin", "accountant"];
function assertManager(role: string) {
  if (!MANAGERS.includes(role)) throw new TRPCError({ code: "FORBIDDEN" });
}

const SALE_KIND: Record<ShopUnit, IdKind> = {
  medicine: "medicineSale",
  zamzam: "zamzamSale",
  coffee: "coffeeSale",
  supernova: "supernovaSale",
};

const money = (column: unknown) => sql<number>`coalesce(sum(${column}), 0)::bigint`.mapWith(Number);
const count = () => sql<number>`count(*)::int`;

/** Current due for each customer: carried-over due, plus unpaid parts of live sales, minus payments. */
const balanceSql = sql<number>`("customers"."opening_due"
  + coalesce((select sum(s.total - s.paid) from ${sales} s where s.customer_id = "customers"."id" and s.status = 'completed'), 0)
  - coalesce((select sum(p.amount) from ${customerPayments} p where p.customer_id = "customers"."id"), 0))::bigint`.mapWith(
  Number,
);

async function customerDue(tx: Parameters<typeof getSettings>[0], id: string) {
  const [row] = await tx
    .select({ balance: balanceSql })
    .from(customers)
    .where(eq(customers.id, id));
  return row?.balance ?? 0;
}

const productInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(160),
  code: optionalText(40),
  category: optionalText(60),
  unitLabel: z.string().trim().min(1).max(20).default("pcs"),
  price: amountOrZero,
  cost: amountOrZero.optional(),
  trackStock: z.boolean().default(true),
  usesBatches: z.boolean().default(false),
  reorderLevel: z.number().int().min(0).max(1_000_000).optional(),
  genericName: optionalText(160),
  strength: optionalText(60),
  active: z.boolean().default(true),
});

export const shopRouter = router({
  /** Which shops this login can open, for the menu. */
  access: tenantProcedure.query(({ ctx }) => unitAccess(ctx.tx, ctx.role, ctx.session.userId)),

  /** Today at a glance for one shop. */
  overview: shopProcedure.query(async ({ ctx, input }) => {
    const settings = await getSettings(ctx.tx);
    const day = businessDate(settings);
    const soon = addDays(day, 60);
    const [[today], [collected], [spent], [stock], [expiring], [dues], [ledger]] =
      await Promise.all([
        ctx.tx
          .select({ total: money(sales.total), paid: money(sales.paid), count: count() })
          .from(sales)
          .where(
            and(
              eq(sales.unit, input.unit),
              eq(sales.businessDate, day),
              eq(sales.status, "completed"),
            ),
          ),
        ctx.tx
          .select({ total: money(customerPayments.amount) })
          .from(customerPayments)
          .where(
            and(eq(customerPayments.unit, input.unit), eq(customerPayments.businessDate, day)),
          ),
        ctx.tx
          .select({ total: money(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.unit, input.unit),
              eq(expenses.businessDate, day),
              isNull(expenses.voidedAt),
              eq(expenses.currency, "BDT"),
            ),
          ),
        ctx.tx
          .select({
            products: count(),
            low: sql<number>`count(*) filter (where ${products.trackStock} and ${products.reorderLevel} is not null and ${products.stockQty} <= ${products.reorderLevel})::int`,
            out: sql<number>`count(*) filter (where ${products.trackStock} and ${products.stockQty} <= 0)::int`,
          })
          .from(products)
          .where(and(eq(products.unit, input.unit), eq(products.active, true))),
        ctx.tx
          .select({ n: count() })
          .from(productBatches)
          .innerJoin(products, eq(products.id, productBatches.productId))
          .where(
            and(
              eq(products.unit, input.unit),
              sql`${productBatches.qty} > 0`,
              lte(productBatches.expiresOn, soon),
            ),
          ),
        ctx.tx
          .select({
            total: sql<number>`coalesce(sum(greatest(${balanceSql}, 0)), 0)::bigint`.mapWith(
              Number,
            ),
          })
          .from(customers)
          .where(eq(customers.unit, input.unit)),
        ctx.tx
          .select({
            net: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'in' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)::bigint`.mapWith(
              Number,
            ),
          })
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.unit, input.unit),
              eq(ledgerEntries.businessDate, day),
              eq(ledgerEntries.currency, "BDT"),
            ),
          ),
      ]);
    return {
      day,
      sales: today!.total,
      received: today!.paid,
      credit: today!.total - today!.paid,
      count: today!.count,
      collections: collected!.total,
      expenses: spent!.total,
      // From the ledger, so cancellations of earlier sales are counted too.
      cash: ledger!.net,
      products: stock!.products,
      lowStock: stock!.low,
      outOfStock: stock!.out,
      expiringSoon: expiring!.n,
      customersDue: dues!.total,
    };
  }),

  /* -------------------------------------------------------------- products */

  products: shopProcedure
    .input(
      z.object({
        q: z.string().trim().max(80).optional(),
        includeInactive: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const needle = input.q ? `%${input.q.replace(/[%_]/g, "")}%` : null;
      const rows = await ctx.tx
        .select({
          product: products,
          nextExpiry: sql<
            string | null
          >`(select min(b.expires_on)::text from ${productBatches} b where b.product_id = "products"."id" and b.qty > 0)`,
        })
        .from(products)
        .where(
          and(
            eq(products.unit, input.unit),
            input.includeInactive ? undefined : eq(products.active, true),
            needle
              ? or(
                  ilike(products.name, needle),
                  ilike(products.code, needle),
                  ilike(products.genericName, needle),
                )
              : undefined,
          ),
        )
        .orderBy(asc(products.category), asc(products.name));
      return rows.map((r) => ({ ...r.product, nextExpiry: r.nextExpiry }));
    }),

  saveProduct: shopProcedure.input(productInput).mutation(async ({ ctx, input }) => {
    const values = {
      unit: input.unit,
      name: input.name,
      code: input.code ?? null,
      category: input.category ?? null,
      unitLabel: input.unitLabel,
      price: parseAmount(input.price),
      cost: input.cost ? parseAmount(input.cost) : null,
      trackStock: input.trackStock,
      usesBatches: input.unit === "medicine" ? input.usesBatches : false,
      reorderLevel: input.reorderLevel ?? null,
      genericName: input.genericName ?? null,
      strength: input.strength ?? null,
      active: input.active,
    };
    if (input.id) {
      const [row] = await ctx.tx
        .update(products)
        .set(values)
        .where(and(eq(products.id, input.id), eq(products.unit, input.unit)))
        .returning({ id: products.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }
    try {
      const [row] = await ctx.tx.insert(products).values(values).returning({ id: products.id });
      return row!;
    } catch (e) {
      if (
        String(
          (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code,
        ) === "23505"
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "CODE_TAKEN" });
      }
      throw e;
    }
  }),

  /** Stock arriving: a purchase, or a new batch of medicine with its expiry date. */
  receiveStock: shopProcedure
    .input(
      z.object({
        productId: z.uuid(),
        qty: z.number().int().min(1).max(1_000_000),
        batchNo: optionalText(60),
        expiresOn: dateKey.optional(),
        cost: amountOrZero.optional(),
        note: optionalText(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.tx
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.unit, input.unit)))
        .for("update");
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      if (!product.trackStock)
        throw new TRPCError({ code: "BAD_REQUEST", message: "NO_STOCK_TRACKING" });

      let batchId: string | null = null;
      if (product.usesBatches) {
        if (!input.batchNo || !input.expiresOn)
          throw new TRPCError({ code: "BAD_REQUEST", message: "BATCH_REQUIRED" });
        const settings = await getSettings(ctx.tx);
        if (input.expiresOn <= businessDate(settings))
          throw new TRPCError({ code: "BAD_REQUEST", message: "EXPIRED_BATCH" });
        const [same] = await ctx.tx
          .select({ id: productBatches.id })
          .from(productBatches)
          .where(
            and(
              eq(productBatches.productId, product.id),
              eq(productBatches.batchNo, input.batchNo),
              eq(productBatches.expiresOn, input.expiresOn),
            ),
          )
          .for("update");
        if (same) {
          await ctx.tx
            .update(productBatches)
            .set({ qty: sql`${productBatches.qty} + ${input.qty}` })
            .where(eq(productBatches.id, same.id));
          batchId = same.id;
        } else {
          const [created] = await ctx.tx
            .insert(productBatches)
            .values({
              productId: product.id,
              batchNo: input.batchNo,
              expiresOn: input.expiresOn,
              qty: input.qty,
              cost: input.cost ? parseAmount(input.cost) : null,
            })
            .returning({ id: productBatches.id });
          batchId = created!.id;
        }
      }
      await ctx.tx
        .insert(stockMovements)
        .values({
          productId: product.id,
          batchId,
          qty: input.qty,
          reason: "purchase",
          note: input.note,
        });
      const [updated] = await ctx.tx
        .update(products)
        .set({
          stockQty: sql`${products.stockQty} + ${input.qty}`,
          ...(input.cost && !product.usesBatches ? { cost: parseAmount(input.cost) } : {}),
        })
        .where(eq(products.id, product.id))
        .returning({ stockQty: products.stockQty });
      return { stockQty: updated!.stockQty, batchId };
    }),

  /** Correct a count (breakage, a recount, expired stock thrown away). A reason is required. */
  adjustStock: shopProcedure
    .input(
      z.object({
        productId: z.uuid(),
        batchId: z.uuid().optional(),
        qty: z
          .number()
          .int()
          .min(-1_000_000)
          .max(1_000_000)
          .refine((n) => n !== 0, "INVALID_QTY"),
        note: z.string().trim().min(3).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.tx
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.unit, input.unit)))
        .for("update");
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      if (product.usesBatches) {
        if (!input.batchId) throw new TRPCError({ code: "BAD_REQUEST", message: "BATCH_REQUIRED" });
        const [batch] = await ctx.tx
          .select()
          .from(productBatches)
          .where(
            and(eq(productBatches.id, input.batchId), eq(productBatches.productId, product.id)),
          )
          .for("update");
        if (!batch) throw new TRPCError({ code: "NOT_FOUND" });
        if (batch.qty + input.qty < 0)
          throw new TRPCError({ code: "BAD_REQUEST", message: "NEGATIVE_STOCK" });
        await ctx.tx
          .update(productBatches)
          .set({ qty: batch.qty + input.qty })
          .where(eq(productBatches.id, batch.id));
      }
      if (product.stockQty + input.qty < 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "NEGATIVE_STOCK" });
      await ctx.tx.insert(stockMovements).values({
        productId: product.id,
        batchId: input.batchId ?? null,
        qty: input.qty,
        reason: "adjustment",
        note: input.note,
      });
      await ctx.tx
        .update(products)
        .set({ stockQty: product.stockQty + input.qty })
        .where(eq(products.id, product.id));
      return { stockQty: product.stockQty + input.qty };
    }),

  batches: shopProcedure.input(z.object({ productId: z.uuid() })).query(({ ctx, input }) =>
    ctx.tx
      .select()
      .from(productBatches)
      .innerJoin(products, eq(products.id, productBatches.productId))
      .where(and(eq(productBatches.productId, input.productId), eq(products.unit, input.unit)))
      .orderBy(asc(productBatches.expiresOn))
      .then((rows) => rows.map((r) => r.product_batches)),
  ),

  /** Batches with stock that expire within `days` (or already have). */
  expiring: shopProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(60) }))
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const today = businessDate(settings);
      const rows = await ctx.tx
        .select({
          id: productBatches.id,
          batchNo: productBatches.batchNo,
          expiresOn: productBatches.expiresOn,
          qty: productBatches.qty,
          productId: products.id,
          name: products.name,
          strength: products.strength,
          unitLabel: products.unitLabel,
        })
        .from(productBatches)
        .innerJoin(products, eq(products.id, productBatches.productId))
        .where(
          and(
            eq(products.unit, input.unit),
            sql`${productBatches.qty} > 0`,
            lte(productBatches.expiresOn, addDays(today, input.days)),
          ),
        )
        .orderBy(asc(productBatches.expiresOn));
      return { today, rows };
    }),

  movements: shopProcedure.input(z.object({ productId: z.uuid() })).query(({ ctx, input }) =>
    ctx.tx
      .select({
        id: stockMovements.id,
        qty: stockMovements.qty,
        reason: stockMovements.reason,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        batchNo: productBatches.batchNo,
        saleRef: sales.ref,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(productBatches, eq(productBatches.id, stockMovements.batchId))
      .leftJoin(sales, eq(sales.id, stockMovements.saleId))
      .where(and(eq(stockMovements.productId, input.productId), eq(products.unit, input.unit)))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(60),
  ),

  /* ------------------------------------------------------------- customers */

  customers: shopProcedure
    .input(z.object({ routeId: z.uuid().optional(), q: z.string().trim().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const needle = input.q ? `%${input.q.replace(/[%_]/g, "")}%` : null;
      return ctx.tx
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          address: customers.address,
          area: customers.area,
          routeId: customers.routeId,
          active: customers.active,
          sortOrder: customers.sortOrder,
          openingDue: customers.openingDue,
          balance: balanceSql,
        })
        .from(customers)
        .where(
          and(
            eq(customers.unit, input.unit),
            input.routeId ? eq(customers.routeId, input.routeId) : undefined,
            needle
              ? or(
                  ilike(customers.name, needle),
                  ilike(customers.phone, needle),
                  ilike(customers.area, needle),
                )
              : undefined,
          ),
        )
        .orderBy(desc(customers.active), asc(customers.sortOrder), asc(customers.name));
    }),

  customer: shopProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({
        customer: customers,
        balance: balanceSql,
        routeWeekday: routes.weekday,
        routeName: routes.name,
      })
      .from(customers)
      .leftJoin(routes, eq(routes.id, customers.routeId))
      .where(and(eq(customers.id, input.id), eq(customers.unit, input.unit)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const [history, payments] = await Promise.all([
      ctx.tx
        .select({
          id: sales.id,
          ref: sales.ref,
          businessDate: sales.businessDate,
          total: sales.total,
          paid: sales.paid,
          status: sales.status,
          qty: sql<number>`(select coalesce(sum(i.qty), 0)::int from ${saleItems} i where i.sale_id = "sales"."id")`,
        })
        .from(sales)
        .where(eq(sales.customerId, input.id))
        .orderBy(desc(sales.soldAt))
        .limit(40),
      ctx.tx
        .select()
        .from(customerPayments)
        .where(eq(customerPayments.customerId, input.id))
        .orderBy(desc(customerPayments.receivedAt))
        .limit(40),
    ]);
    return { ...row, history, payments };
  }),

  saveCustomer: shopProcedure
    .input(
      z.object({
        id: z.uuid().optional(),
        name: z.string().trim().min(1).max(120),
        phone: optionalText(30),
        address: optionalText(200),
        area: optionalText(80),
        routeId: z.uuid().nullable().optional(),
        openingDue: amountOrZero.optional(),
        sortOrder: z.number().int().min(0).max(10_000).default(0),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.routeId) {
        const [route] = await ctx.tx
          .select({ id: routes.id })
          .from(routes)
          .where(and(eq(routes.id, input.routeId), eq(routes.unit, input.unit)));
        if (!route) throw new TRPCError({ code: "NOT_FOUND" });
      }
      const values = {
        unit: input.unit,
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        area: input.area ?? null,
        routeId: input.routeId ?? null,
        sortOrder: input.sortOrder,
        active: input.active,
      };
      if (input.id) {
        // A carried-over due is set once, when the customer is added; later changes go through sales and payments.
        const [row] = await ctx.tx
          .update(customers)
          .set(values)
          .where(and(eq(customers.id, input.id), eq(customers.unit, input.unit)))
          .returning({ id: customers.id });
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }
      const [row] = await ctx.tx
        .insert(customers)
        .values({ ...values, openingDue: input.openingDue ? parseAmount(input.openingDue) : 0 })
        .returning({ id: customers.id });
      return row!;
    }),

  /** A shop pays off some of what it owes. */
  collect: shopProcedure
    .input(
      z.object({
        customerId: z.uuid(),
        amount: amountInput,
        method: z.enum(paymentMethods),
        reference: optionalText(80),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [customer] = await ctx.tx
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.unit, input.unit)))
        .for("update");
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      const amount = parseAmount(input.amount);
      const due = await customerDue(ctx.tx, customer.id);
      if (amount > due)
        throw new TRPCError({ code: "BAD_REQUEST", message: `OVERPAYMENT:${Math.max(due, 0)}` });

      const settings = await getSettings(ctx.tx);
      const day = entryDate(settings, ctx.role, input.date);
      const id = randomUUID();
      const now = new Date();
      const [entry] = await ctx.tx
        .insert(ledgerEntries)
        .values({
          unit: input.unit,
          direction: "in",
          amount,
          currency: "BDT",
          businessDate: day,
          occurredAt: now,
          sourceType: "customer_payment",
          sourceId: id,
          category: input.method,
          memo: customer.name,
        })
        .returning({ id: ledgerEntries.id });
      await ctx.tx.insert(customerPayments).values({
        id,
        unit: input.unit,
        customerId: customer.id,
        amount,
        method: input.method,
        reference: input.reference,
        note: input.note,
        receivedAt: now,
        businessDate: day,
        ledgerEntryId: entry!.id,
      });
      return { id, balance: due - amount };
    }),

  /* ---------------------------------------------------------------- routes */

  /** The seven delivery routes, one per weekday. Created on first use. */
  routes: shopProcedure.query(async ({ ctx, input }) => {
    await ctx.tx
      .insert(routes)
      .values([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ unit: input.unit, weekday, name: "" })))
      .onConflictDoNothing();
    return ctx.tx
      .select({
        id: routes.id,
        weekday: routes.weekday,
        name: routes.name,
        notes: routes.notes,
        shops: sql<number>`(select count(*)::int from ${customers} c where c.route_id = "routes"."id" and c.active)`,
      })
      .from(routes)
      .where(eq(routes.unit, input.unit))
      .orderBy(asc(routes.weekday));
  }),

  saveRoute: shopProcedure
    .input(z.object({ id: z.uuid(), name: z.string().trim().max(80), notes: optionalText(300) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .update(routes)
        .set({ name: input.name, notes: input.notes ?? null })
        .where(and(eq(routes.id, input.id), eq(routes.unit, input.unit)))
        .returning({ id: routes.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** One day on the road: the weekday's route, its shops, what each got today and what each owes. */
  routeDay: shopProcedure
    .input(z.object({ date: dateKey.optional(), routeId: z.uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const day = input.date ?? businessDate(settings);
      await ctx.tx
        .insert(routes)
        .values([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ unit: input.unit, weekday, name: "" })))
        .onConflictDoNothing();
      const [route] = await ctx.tx
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.unit, input.unit),
            input.routeId ? eq(routes.id, input.routeId) : eq(routes.weekday, weekdayOf(day)),
          ),
        );
      if (!route) throw new TRPCError({ code: "NOT_FOUND" });

      const shops = await ctx.tx
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          area: customers.area,
          address: customers.address,
          balance: balanceSql,
        })
        .from(customers)
        .where(
          and(
            eq(customers.unit, input.unit),
            eq(customers.routeId, route.id),
            eq(customers.active, true),
          ),
        )
        .orderBy(asc(customers.sortOrder), asc(customers.name));

      const ids = shops.map((s) => s.id);
      const [delivered, collected] = ids.length
        ? await Promise.all([
            ctx.tx
              .select({
                customerId: sales.customerId,
                saleId: sales.id,
                ref: sales.ref,
                total: sales.total,
                paid: sales.paid,
                qty: sql<number>`(select coalesce(sum(i.qty), 0)::int from ${saleItems} i where i.sale_id = "sales"."id")`,
              })
              .from(sales)
              .where(
                and(
                  eq(sales.unit, input.unit),
                  eq(sales.businessDate, day),
                  eq(sales.status, "completed"),
                  inArray(sales.customerId, ids),
                ),
              ),
            ctx.tx
              .select({
                customerId: customerPayments.customerId,
                amount: money(customerPayments.amount),
              })
              .from(customerPayments)
              .where(
                and(
                  eq(customerPayments.businessDate, day),
                  inArray(customerPayments.customerId, ids),
                ),
              )
              .groupBy(customerPayments.customerId),
          ])
        : [[], []];

      const rows = shops.map((s) => {
        const mine = delivered.filter((d) => d.customerId === s.id);
        return {
          ...s,
          sales: mine.map((d) => ({
            id: d.saleId,
            ref: d.ref,
            total: d.total,
            paid: d.paid,
            qty: d.qty,
          })),
          qty: mine.reduce((a, d) => a + d.qty, 0),
          total: mine.reduce((a, d) => a + d.total, 0),
          paid: mine.reduce((a, d) => a + d.paid, 0),
          collected: collected.find((c) => c.customerId === s.id)?.amount ?? 0,
        };
      });
      return {
        day,
        today: businessDate(settings),
        route,
        shops: rows,
        totals: {
          visited: rows.filter((r) => r.sales.length > 0 || r.collected > 0).length,
          qty: rows.reduce((a, r) => a + r.qty, 0),
          total: rows.reduce((a, r) => a + r.total, 0),
          paid: rows.reduce((a, r) => a + r.paid, 0),
          collected: rows.reduce((a, r) => a + r.collected, 0),
          due: rows.reduce((a, r) => a + Math.max(r.balance, 0), 0),
        },
      };
    }),

  /** Which shop got how much over a period, route by route. */
  deliveries: shopProcedure
    .input(z.object({ from: dateKey, to: dateKey, routeId: z.uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.to < input.from)
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_DATES" });
      const rows = await ctx.tx
        .select({
          customerId: customers.id,
          name: customers.name,
          area: customers.area,
          routeWeekday: routes.weekday,
          routeName: routes.name,
          deliveries: sql<number>`count(distinct ${sales.id})::int`,
          qty: sql<number>`coalesce(sum(${saleItems.qty}), 0)::int`,
          total: money(saleItems.lineTotal),
        })
        .from(sales)
        .innerJoin(customers, eq(customers.id, sales.customerId))
        .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
        .leftJoin(routes, eq(routes.id, customers.routeId))
        .where(
          and(
            eq(sales.unit, input.unit),
            eq(sales.status, "completed"),
            gte(sales.businessDate, input.from),
            lte(sales.businessDate, input.to),
            input.routeId ? eq(customers.routeId, input.routeId) : undefined,
          ),
        )
        .groupBy(customers.id, customers.name, customers.area, routes.weekday, routes.name)
        .orderBy(asc(routes.weekday), desc(sql`coalesce(sum(${saleItems.qty}), 0)`));
      const products_ = await ctx.tx
        .select({
          name: saleItems.name,
          qty: sql<number>`sum(${saleItems.qty})::int`,
          total: money(saleItems.lineTotal),
        })
        .from(sales)
        .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
        .innerJoin(customers, eq(customers.id, sales.customerId))
        .where(
          and(
            eq(sales.unit, input.unit),
            eq(sales.status, "completed"),
            gte(sales.businessDate, input.from),
            lte(sales.businessDate, input.to),
            input.routeId ? eq(customers.routeId, input.routeId) : undefined,
          ),
        )
        .groupBy(saleItems.name)
        .orderBy(desc(sql`sum(${saleItems.qty})`));
      return { rows, products: products_ };
    }),

  /* ----------------------------------------------------------------- sales */

  /**
   * Ring up a sale. In one transaction: lock the products (and medicine
   * batches), check stock, take the next sale number, take stock out
   * (earliest expiry first), write the sale and, for money received now, the
   * ledger entry. Whatever is not paid becomes the customer's due.
   */
  sell: shopProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.uuid(),
              qty: z.number().int().min(1).max(1_000_000),
              unitPrice: amountOrZero.optional(),
            }),
          )
          .min(1)
          .max(100),
        customerId: z.uuid().optional(),
        routeId: z.uuid().optional(),
        discount: amountOrZero.optional(),
        paid: amountOrZero.optional(),
        method: z.enum(paymentMethods).default("cash"),
        reference: optionalText(80),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const day = entryDate(settings, ctx.role, input.date);
      const ids = [...new Set(input.items.map((i) => i.productId))];
      const found = await ctx.tx
        .select()
        .from(products)
        .where(
          and(inArray(products.id, ids), eq(products.unit, input.unit), eq(products.active, true)),
        )
        .orderBy(asc(products.id))
        .for("update");
      if (found.length !== ids.length)
        throw new TRPCError({ code: "BAD_REQUEST", message: "PRODUCT_UNAVAILABLE" });
      const byId = new Map(found.map((p) => [p.id, p]));

      const lines = input.items.map((i) => {
        const product = byId.get(i.productId)!;
        return {
          product,
          qty: i.qty,
          unitPrice: i.unitPrice !== undefined ? parseAmount(i.unitPrice) : product.price,
        };
      });

      let totals;
      try {
        totals = saleTotals(
          lines,
          input.discount ? parseAmount(input.discount) : 0,
          input.paid !== undefined ? parseAmount(input.paid) : undefined,
        );
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "INVALID_AMOUNT",
        });
      }

      let customerName: string | null = null;
      if (input.customerId) {
        const [c] = await ctx.tx
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(and(eq(customers.id, input.customerId), eq(customers.unit, input.unit)));
        if (!c) throw new TRPCError({ code: "NOT_FOUND" });
        customerName = c.name;
      }
      if (totals.due > 0 && !input.customerId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "CUSTOMER_REQUIRED" });

      // Stock check per product (a cart may list one product twice).
      const wanted = new Map<string, number>();
      for (const l of lines) wanted.set(l.product.id, (wanted.get(l.product.id) ?? 0) + l.qty);
      const batchProducts = found.filter((p) => p.trackStock && p.usesBatches).map((p) => p.id);
      const batches = batchProducts.length
        ? await ctx.tx
            .select()
            .from(productBatches)
            .where(inArray(productBatches.productId, batchProducts))
            .orderBy(asc(productBatches.id))
            .for("update")
        : [];
      for (const [productId, qty] of wanted) {
        const p = byId.get(productId)!;
        if (!p.trackStock) continue;
        if (p.stockQty < qty)
          throw new TRPCError({ code: "BAD_REQUEST", message: `OUT_OF_STOCK:${p.name}` });
      }

      const saleId = randomUUID();
      const now = new Date();
      const ref = await nextReference(ctx.tx, settings, SALE_KIND[input.unit], now);

      let ledgerEntryId: string | null = null;
      if (totals.paid > 0) {
        const [entry] = await ctx.tx
          .insert(ledgerEntries)
          .values({
            unit: input.unit,
            direction: "in",
            amount: totals.paid,
            currency: "BDT",
            businessDate: day,
            occurredAt: now,
            sourceType: "pos_sale",
            sourceId: saleId,
            category: input.method,
            memo: customerName ? `${ref} · ${customerName}` : ref,
          })
          .returning({ id: ledgerEntries.id });
        ledgerEntryId = entry!.id;
      }

      await ctx.tx.insert(sales).values({
        id: saleId,
        unit: input.unit,
        ref,
        customerId: input.customerId ?? null,
        routeId: input.routeId ?? null,
        soldAt: now,
        businessDate: day,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        paid: totals.paid,
        method: input.method,
        reference: input.reference,
        note: input.note,
        ledgerEntryId,
      });

      // Take stock out line by line; medicine comes out of the batches that expire first.
      const stockLeft = new Map(batches.map((b) => [b.id, b.qty]));
      const items: (typeof saleItems.$inferInsert)[] = [];
      const moves: (typeof stockMovements.$inferInsert)[] = [];
      for (const l of lines) {
        const p = l.product;
        if (p.trackStock && p.usesBatches) {
          let picks;
          try {
            picks = pickBatches(
              batches
                .filter((b) => b.productId === p.id)
                .map((b) => ({ id: b.id, expiresOn: b.expiresOn, qty: stockLeft.get(b.id)! })),
              l.qty,
              day,
            );
          } catch {
            throw new TRPCError({ code: "BAD_REQUEST", message: `OUT_OF_STOCK:${p.name}` });
          }
          for (const pick of picks) {
            stockLeft.set(pick.batchId, stockLeft.get(pick.batchId)! - pick.qty);
            items.push({
              saleId,
              position: items.length + 1,
              productId: p.id,
              batchId: pick.batchId,
              name: p.name,
              qty: pick.qty,
              unitPrice: l.unitPrice,
              lineTotal: pick.qty * l.unitPrice,
            });
            moves.push({
              productId: p.id,
              batchId: pick.batchId,
              qty: -pick.qty,
              reason: "sale",
              saleId,
            });
          }
        } else {
          items.push({
            saleId,
            position: items.length + 1,
            productId: p.id,
            name: p.name,
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.qty * l.unitPrice,
          });
          if (p.trackStock) moves.push({ productId: p.id, qty: -l.qty, reason: "sale", saleId });
        }
      }
      await ctx.tx.insert(saleItems).values(items);
      if (moves.length) await ctx.tx.insert(stockMovements).values(moves);
      for (const b of batches) {
        const left = stockLeft.get(b.id)!;
        if (left !== b.qty)
          await ctx.tx.update(productBatches).set({ qty: left }).where(eq(productBatches.id, b.id));
      }
      for (const [productId, qty] of wanted) {
        if (byId.get(productId)!.trackStock) {
          await ctx.tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} - ${qty}` })
            .where(eq(products.id, productId));
        }
      }

      return { id: saleId, ref, totals };
    }),

  /** Cancel a sale: stock goes back, money received is reversed, the customer's due drops. Managers only. */
  voidSale: shopProcedure
    .input(z.object({ id: z.uuid(), reason: z.string().trim().min(4).max(300) }))
    .mutation(async ({ ctx, input }) => {
      assertManager(ctx.role);
      const [sale] = await ctx.tx
        .select()
        .from(sales)
        .where(and(eq(sales.id, input.id), eq(sales.unit, input.unit)))
        .for("update");
      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
      if (sale.status === "void")
        throw new TRPCError({ code: "CONFLICT", message: "ALREADY_VOID" });

      const settings = await getSettings(ctx.tx);
      const now = new Date();
      let voidLedgerEntryId: string | null = null;
      if (sale.paid > 0) {
        const [reversal] = await ctx.tx
          .insert(ledgerEntries)
          .values({
            unit: sale.unit,
            direction: "out",
            amount: sale.paid,
            currency: "BDT",
            businessDate: businessDate(settings, now),
            occurredAt: now,
            sourceType: "pos_sale_void",
            sourceId: sale.id,
            category: sale.method,
            memo: `VOID ${sale.ref}: ${input.reason}`,
            reversesId: sale.ledgerEntryId,
          })
          .returning({ id: ledgerEntries.id });
        voidLedgerEntryId = reversal!.id;
      }

      const items = await ctx.tx
        .select({
          productId: saleItems.productId,
          batchId: saleItems.batchId,
          qty: saleItems.qty,
          trackStock: products.trackStock,
        })
        .from(saleItems)
        .innerJoin(products, eq(products.id, saleItems.productId))
        .where(eq(saleItems.saleId, sale.id));
      for (const item of items) {
        if (!item.trackStock) continue;
        if (item.batchId) {
          await ctx.tx
            .update(productBatches)
            .set({ qty: sql`${productBatches.qty} + ${item.qty}` })
            .where(eq(productBatches.id, item.batchId));
        }
        await ctx.tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${item.qty}` })
          .where(eq(products.id, item.productId));
        await ctx.tx
          .insert(stockMovements)
          .values({
            productId: item.productId,
            batchId: item.batchId,
            qty: item.qty,
            reason: "void",
            saleId: sale.id,
            note: input.reason,
          });
      }

      await ctx.tx
        .update(sales)
        .set({ status: "void", voidedAt: now, voidReason: input.reason, voidLedgerEntryId })
        .where(eq(sales.id, sale.id));
      return { id: sale.id };
    }),

  sales: shopProcedure
    .input(
      z.object({
        date: dateKey.optional(),
        customerId: z.uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const day = input.date ?? businessDate(settings);
      return ctx.tx
        .select({
          id: sales.id,
          ref: sales.ref,
          soldAt: sales.soldAt,
          businessDate: sales.businessDate,
          total: sales.total,
          paid: sales.paid,
          discount: sales.discount,
          method: sales.method,
          status: sales.status,
          customerName: customers.name,
          items: sql<string>`(select string_agg(i.name || ' × ' || i.qty, ', ' order by i.position) from ${saleItems} i where i.sale_id = "sales"."id")`,
        })
        .from(sales)
        .leftJoin(customers, eq(customers.id, sales.customerId))
        .where(
          and(
            eq(sales.unit, input.unit),
            input.customerId ? eq(sales.customerId, input.customerId) : eq(sales.businessDate, day),
          ),
        )
        .orderBy(desc(sales.soldAt))
        .limit(input.limit);
    }),

  /** Everything the printed sale receipt needs. */
  sale: shopProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ sale: sales, customer: customers, agency: tenantSettings })
      .from(sales)
      .leftJoin(customers, eq(customers.id, sales.customerId))
      .innerJoin(tenantSettings, eq(tenantSettings.tenantId, sales.tenantId))
      .where(and(eq(sales.id, input.id), eq(sales.unit, input.unit)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const items = await ctx.tx
      .select({
        name: saleItems.name,
        qty: saleItems.qty,
        unitPrice: saleItems.unitPrice,
        lineTotal: saleItems.lineTotal,
        batchNo: productBatches.batchNo,
        expiresOn: productBatches.expiresOn,
        unitLabel: products.unitLabel,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .leftJoin(productBatches, eq(productBatches.id, saleItems.batchId))
      .where(eq(saleItems.saleId, input.id))
      .orderBy(asc(saleItems.position));
    const balance = row.customer ? await customerDue(ctx.tx, row.customer.id) : null;
    return { ...row, items, balance };
  }),

  /* ------------------------------------------------------------- statement */

  /** The shop's statement for one day: what sold, how it was paid, what was collected and spent. */
  daily: shopProcedure
    .input(z.object({ date: dateKey.optional() }))
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const day = input.date ?? businessDate(settings);
      const live = and(
        eq(sales.unit, input.unit),
        eq(sales.businessDate, day),
        eq(sales.status, "completed"),
      );
      const [[sum], byProduct, byMethod, collections, spent, voided, [ledger]] = await Promise.all([
        ctx.tx
          .select({
            count: count(),
            subtotal: money(sales.subtotal),
            discount: money(sales.discount),
            total: money(sales.total),
            paid: money(sales.paid),
          })
          .from(sales)
          .where(live),
        ctx.tx
          .select({
            name: saleItems.name,
            qty: sql<number>`sum(${saleItems.qty})::int`,
            total: money(saleItems.lineTotal),
          })
          .from(saleItems)
          .innerJoin(sales, eq(sales.id, saleItems.saleId))
          .where(live)
          .groupBy(saleItems.name)
          .orderBy(desc(sql`sum(${saleItems.lineTotal})`)),
        ctx.tx
          .select({ method: sales.method, total: money(sales.paid), count: count() })
          .from(sales)
          .where(and(live, sql`${sales.paid} > 0`))
          .groupBy(sales.method),
        ctx.tx
          .select({
            id: customerPayments.id,
            amount: customerPayments.amount,
            method: customerPayments.method,
            name: customers.name,
          })
          .from(customerPayments)
          .innerJoin(customers, eq(customers.id, customerPayments.customerId))
          .where(
            and(eq(customerPayments.unit, input.unit), eq(customerPayments.businessDate, day)),
          ),
        ctx.tx
          .select()
          .from(expenses)
          .where(
            and(
              eq(expenses.unit, input.unit),
              eq(expenses.businessDate, day),
              isNull(expenses.voidedAt),
            ),
          ),
        ctx.tx
          .select({ ref: sales.ref, total: sales.total, reason: sales.voidReason })
          .from(sales)
          .where(
            and(eq(sales.unit, input.unit), eq(sales.businessDate, day), eq(sales.status, "void")),
          ),
        ctx.tx
          .select({
            in: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'in'), 0)::bigint`.mapWith(
              Number,
            ),
            out: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'out'), 0)::bigint`.mapWith(
              Number,
            ),
          })
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.unit, input.unit),
              eq(ledgerEntries.businessDate, day),
              eq(ledgerEntries.currency, "BDT"),
            ),
          ),
      ]);
      const collected = collections.reduce((a, c) => a + c.amount, 0);
      const expenseTotal = spent
        .filter((e) => e.currency === "BDT")
        .reduce((a, e) => a + e.amount, 0);
      return {
        day,
        today: businessDate(settings),
        agency: settings.legalName,
        sales: { ...sum!, credit: sum!.total - sum!.paid },
        byProduct,
        byMethod,
        collections,
        collected,
        expenses: spent,
        expenseTotal,
        voided,
        ledger: { in: ledger!.in, out: ledger!.out, net: ledger!.in - ledger!.out },
      };
    }),

  /** Shop running costs (cups, ice, delivery fuel...). */
  expense: shopProcedure
    .input(
      z.object({
        category: z.string().trim().min(1).max(60),
        payee: optionalText(120),
        amount: amountInput,
        method: z.enum(paymentMethods),
        reference: optionalText(80),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.tx);
      const row = await recordExpense(ctx.tx, {
        unit: input.unit,
        category: input.category,
        payee: input.payee,
        amount: parseAmount(input.amount),
        currency: "BDT",
        method: input.method,
        reference: input.reference,
        note: input.note,
        day: entryDate(settings, ctx.role, input.date),
      });
      return { id: row.id };
    }),

  voidExpense: shopProcedure
    .input(z.object({ id: z.uuid(), reason: z.string().trim().min(4).max(300) }))
    .mutation(async ({ ctx, input }) => {
      assertManager(ctx.role);
      const [row] = await ctx.tx
        .select({ unit: expenses.unit })
        .from(expenses)
        .where(eq(expenses.id, input.id));
      if (!row || row.unit !== input.unit) throw new TRPCError({ code: "NOT_FOUND" });
      return voidExpense(ctx.tx, input.id, input.reason);
    }),
});
