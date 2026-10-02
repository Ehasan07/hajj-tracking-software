import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { businessUnitEnum, currencyEnum } from "./tenancy";
import { id, money, tenantId, tenantIsolation } from "./_shared";

export const directionEnum = pgEnum("direction", ["in", "out"]);

/**
 * Every taka that moves goes through this table. Rows are never updated or
 * deleted (the app role has INSERT and SELECT only); a mistake is fixed with
 * a reversing entry that points at the original.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    direction: directionEnum().notNull(),
    amount: money().notNull(),
    currency: currencyEnum().notNull(),
    /** Calendar day in the tenant's time zone, used by statements. */
    businessDate: date().notNull(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** What created the entry, e.g. "pilgrim_payment", "pos_sale", "salary". */
    sourceType: text().notNull(),
    sourceId: text().notNull(),
    category: text(),
    memo: text(),
    reversesId: uuid(),
    createdBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("ledger_amount_positive", sql`${t.amount} > 0`),
    index("ledger_tenant_date_idx").on(t.tenantId, t.businessDate, t.unit),
    index("ledger_source_idx").on(t.tenantId, t.sourceType, t.sourceId),
    tenantIsolation("ledger_entries"),
  ],
).enableRLS();

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
