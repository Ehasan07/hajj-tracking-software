import { sql } from "drizzle-orm";
import type { Database, Transaction } from "./index";

export interface TenantContext {
  tenantId: string;
  userId: string;
}

/**
 * Run work inside a transaction scoped to one tenant. The settings are
 * transaction-local, so a pooled connection never leaks a tenant id into the
 * next request. RLS policies read `app.tenant_id`; audit triggers read
 * `app.user_id`.
 */
export async function withTenant<T>(
  db: Database,
  ctx: TenantContext,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (!ctx.tenantId) throw new Error("withTenant called without a tenant id");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.tenant_id', ${ctx.tenantId}, true), set_config('app.user_id', ${ctx.userId}, true)`,
    );
    return work(tx);
  });
}

/**
 * A transaction that knows who is acting but belongs to no agency. Used for
 * platform-admin work, which goes only through SECURITY DEFINER functions
 * that check is_platform_admin() themselves.
 */
export async function withActor<T>(db: Database, userId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return work(tx);
  });
}
