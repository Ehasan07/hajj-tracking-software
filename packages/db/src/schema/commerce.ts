import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentMethodEnum } from "./hajj";
import { businessUnitEnum, currencyEnum } from "./tenancy";
import { id, money, tenantId, tenantIsolation, timestamps } from "./_shared";

/**
 * One shop engine for every side business: the medicine shop, Zamzam water,
 * Naba Coffee and Supernova. Rows carry the business unit; the screens differ,
 * the bookkeeping does not.
 *
 * Stock is the sum of movements. `products.stockQty` and `productBatches.qty`
 * are kept in step inside the same transaction as each movement so screens can
 * read them directly.
 */

export const stockReasonEnum = pgEnum("stock_reason", [
  "purchase",
  "sale",
  "adjustment",
  "return",
  "void",
]);
export const saleStatusEnum = pgEnum("sale_status", ["completed", "void"]);

export const products = pgTable(
  "products",
  {
    id: id(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    name: text().notNull(),
    code: text(),
    category: text(),
    /** How it is counted on the shelf: pcs, strip, box, jar, cup... */
    unitLabel: text().notNull().default("pcs"),
    price: money().notNull(),
    cost: money(),
    trackStock: boolean().notNull().default(true),
    /** Medicine: stock is held in batches with expiry dates. */
    usesBatches: boolean().notNull().default(false),
    stockQty: integer().notNull().default(0),
    reorderLevel: integer(),
    genericName: text(),
    strength: text(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_code_idx").on(t.tenantId, t.unit, t.code),
    index("products_unit_idx").on(t.tenantId, t.unit, t.active),
    index("products_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
    check("products_price", sql`${t.price} >= 0`),
    tenantIsolation("products"),
  ],
).enableRLS();

export const productBatches = pgTable(
  "product_batches",
  {
    id: id(),
    tenantId: tenantId(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    batchNo: text().notNull(),
    expiresOn: date().notNull(),
    qty: integer().notNull(),
    cost: money(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_batches_fefo_idx").on(t.tenantId, t.productId, t.expiresOn),
    check("product_batches_qty", sql`${t.qty} >= 0`),
    tenantIsolation("product_batches"),
  ],
).enableRLS();

/** Every change to stock, append-only. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tenantId: tenantId(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    batchId: uuid(),
    qty: integer().notNull(),
    reason: stockReasonEnum().notNull(),
    saleId: uuid(),
    note: text(),
    createdBy: text()
      .notNull()
      .default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("stock_movements_product_idx").on(t.tenantId, t.productId, t.createdAt),
    check("stock_movements_nonzero", sql`${t.qty} <> 0`),
    tenantIsolation("stock_movements"),
  ],
).enableRLS();

/** Zamzam delivery routes: one per weekday (0 = Sunday … 6 = Saturday, as in JavaScript). */
export const routes = pgTable(
  "routes",
  {
    id: id(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    weekday: smallint().notNull(),
    name: text().notNull(),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("routes_weekday_idx").on(t.tenantId, t.unit, t.weekday),
    check("routes_weekday", sql`${t.weekday} between 0 and 6`),
    tenantIsolation("routes"),
  ],
).enableRLS();

/** Shops and regular buyers. For Zamzam each shop sits on one route. */
export const customers = pgTable(
  "customers",
  {
    id: id(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    name: text().notNull(),
    phone: text(),
    address: text(),
    area: text(),
    routeId: uuid().references(() => routes.id, { onDelete: "set null" }),
    /** Due carried over from before the software, counted in the customer's balance. */
    openingDue: money().notNull().default(0),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("customers_unit_idx").on(t.tenantId, t.unit, t.routeId),
    check("customers_opening_due", sql`${t.openingDue} >= 0`),
    tenantIsolation("customers"),
  ],
).enableRLS();

/**
 * A sale. Money actually received goes to the ledger (cash basis); anything
 * not paid is the customer's due, collected later with a customer payment.
 */
export const sales = pgTable(
  "sales",
  {
    id: uuid().primaryKey(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    ref: text().notNull(),
    customerId: uuid().references(() => customers.id, { onDelete: "restrict" }),
    routeId: uuid(),
    soldAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    businessDate: date().notNull(),
    subtotal: money().notNull(),
    discount: money().notNull().default(0),
    total: money().notNull(),
    paid: money().notNull(),
    method: paymentMethodEnum().notNull(),
    reference: text(),
    status: saleStatusEnum().notNull().default("completed"),
    note: text(),
    ledgerEntryId: uuid(),
    voidedAt: timestamp({ withTimezone: true }),
    voidReason: text(),
    voidLedgerEntryId: uuid(),
    createdBy: text()
      .notNull()
      .default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sales_ref_idx").on(t.tenantId, t.ref),
    index("sales_day_idx").on(t.tenantId, t.unit, t.businessDate),
    index("sales_customer_idx").on(t.tenantId, t.customerId),
    check(
      "sales_amounts",
      sql`${t.subtotal} >= 0 and ${t.discount} >= 0 and ${t.discount} <= ${t.subtotal} and ${t.total} = ${t.subtotal} - ${t.discount} and ${t.paid} >= 0 and ${t.paid} <= ${t.total}`,
    ),
    check(
      "sales_credit_needs_customer",
      sql`${t.paid} = ${t.total} or ${t.customerId} is not null`,
    ),
    tenantIsolation("sales"),
  ],
).enableRLS();

export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    tenantId: tenantId(),
    saleId: uuid()
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    batchId: uuid(),
    /** Order on the receipt. */
    position: smallint().notNull(),
    /** Name at the time of sale, so old receipts read the same after a rename. */
    name: text().notNull(),
    qty: integer().notNull(),
    unitPrice: money().notNull(),
    lineTotal: money().notNull(),
  },
  (t) => [
    index("sale_items_sale_idx").on(t.tenantId, t.saleId),
    check("sale_items_qty", sql`${t.qty} > 0 and ${t.lineTotal} = ${t.qty} * ${t.unitPrice}`),
    tenantIsolation("sale_items"),
  ],
).enableRLS();

/** Money a customer pays against their due (e.g. a shop clearing last week's water). */
export const customerPayments = pgTable(
  "customer_payments",
  {
    id: uuid().primaryKey(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    amount: money().notNull(),
    currency: currencyEnum().notNull().default("BDT"),
    method: paymentMethodEnum().notNull(),
    reference: text(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    businessDate: date().notNull(),
    ledgerEntryId: uuid().notNull(),
    note: text(),
    createdBy: text()
      .notNull()
      .default(sql`current_setting('app.user_id', true)`),
  },
  (t) => [
    index("customer_payments_customer_idx").on(t.tenantId, t.customerId),
    check("customer_payments_amount", sql`${t.amount} > 0`),
    tenantIsolation("customer_payments"),
  ],
).enableRLS();

export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Route = typeof routes.$inferSelect;
