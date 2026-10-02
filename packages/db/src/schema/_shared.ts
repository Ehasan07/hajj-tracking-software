import { sql } from "drizzle-orm";
import { bigint, pgPolicy, pgRole, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

/** Runtime role created in docker/init.sql. Policies are attached to it. */
export const appRole = pgRole("hajj_app").existing();

const currentTenant = sql`current_setting('app.tenant_id', true)`;

/** Standard isolation policy: rows are visible and writable only for the tenant set on the transaction. */
export function tenantIsolation(table: string) {
  return pgPolicy(`${table}_tenant_isolation`, {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`tenant_id = ${currentTenant}`,
    withCheck: sql`tenant_id = ${currentTenant}`,
  });
}

export const id = () => uuid().primaryKey().defaultRandom();

export const tenantId = () =>
  text()
    .notNull()
    .default(currentTenant)
    .references(() => organization.id, { onDelete: "cascade" });

/** Money in minor units. JS numbers are exact up to 9e15 paisa (90 trillion taka). */
export const money = () => bigint({ mode: "number" });

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
