import { sql } from "drizzle-orm";
import { bigint, check, date, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, index } from "drizzle-orm/pg-core";
import { BUSINESS_UNITS, CURRENCIES } from "@hajj/core";
import { organization } from "./auth";
import { tenantId, tenantIsolation, timestamps } from "./_shared";

export const currencyEnum = pgEnum("currency", CURRENCIES);
export const businessUnitEnum = pgEnum("business_unit", BUSINESS_UNITS);
export const localeEnum = pgEnum("locale", ["bn", "en"]);

/** One row per agency. Created by onboarding right after the organization. */
export const tenantSettings = pgTable(
  "tenant_settings",
  {
    tenantId: text()
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    legalName: text().notNull(),
    referencePrefix: text().notNull().default("HJ"),
    licenseNumber: text(),
    address: text(),
    phone: text(),
    email: text(),
    defaultLocale: localeEnum().notNull().default("bn"),
    timeZone: text().notNull().default("Asia/Dhaka"),
    enabledUnits: businessUnitEnum().array().notNull().default(sql`'{hajj,office}'::business_unit[]`),
    branding: jsonb().$type<{ logoKey?: string; accent?: string }>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    check("tenant_settings_prefix_format", sql`${t.referencePrefix} ~ '^[A-Z]{2,5}$'`),
    tenantIsolation("tenant_settings"),
  ],
).enableRLS();

/**
 * Gap-free reference numbers per tenant, kind and year. Incremented with
 * INSERT ... ON CONFLICT DO UPDATE ... RETURNING inside the caller's
 * transaction, which takes a row lock and serialises concurrent requests.
 */
export const counters = pgTable(
  "counters",
  {
    tenantId: tenantId(),
    kind: text().notNull(),
    year: integer().notNull(),
    value: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.kind, t.year] }), tenantIsolation("counters")],
).enableRLS();

/** Daily rate, integer scaled by 1e6 (see RATE_SCALE in @hajj/core). */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    tenantId: tenantId(),
    effectiveOn: date().notNull(),
    base: currencyEnum().notNull(),
    quote: currencyEnum().notNull(),
    rate: bigint({ mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.effectiveOn, t.base, t.quote] }),
    check("exchange_rates_positive", sql`${t.rate} > 0`),
    tenantIsolation("exchange_rates"),
  ],
).enableRLS();

/** Append-only trail of every change. Written by database triggers, not by app code. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    // No foreign key: the trail must outlive a deleted tenant.
    tenantId: text().notNull(),
    actorId: text(),
    tableName: text().notNull(),
    rowId: text().notNull(),
    action: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_row_idx").on(t.tenantId, t.tableName, t.rowId), tenantIsolation("audit_log")],
).enableRLS();

export type TenantSettings = typeof tenantSettings.$inferSelect;
