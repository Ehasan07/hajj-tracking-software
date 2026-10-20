import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { id, tenantId, tenantIsolation } from "./_shared";

/**
 * Every SMS an agency sends: receipt messages to pilgrims and notices to a
 * group of them. Rows are written in the same transaction as the payment or
 * notice, then picked up by the sender (see `sms_claim`). Parts are what the
 * provider bills and what the plan's monthly allowance counts.
 */
export const smsMessages = pgTable(
  "sms_messages",
  {
    id: id(),
    tenantId: tenantId(),
    kind: text().notNull(),
    /** Notices sent together share a batch. */
    batchId: uuid(),
    /** The payment a receipt message belongs to. */
    sourceId: uuid(),
    toPhone: text().notNull(),
    body: text().notNull(),
    parts: integer().notNull(),
    status: text().notNull().default("queued"),
    providerRef: text(),
    error: text(),
    createdBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check("sms_messages_kind", sql`${t.kind} in ('receipt', 'notice')`),
    check("sms_messages_status", sql`${t.status} in ('queued', 'sending', 'sent', 'failed', 'skipped', 'expired')`),
    check("sms_messages_parts", sql`${t.parts} between 1 and 10`),
    index("sms_messages_tenant_idx").on(t.tenantId, t.createdAt),
    index("sms_messages_queue_idx").on(t.status, t.createdAt),
    index("sms_messages_batch_idx").on(t.tenantId, t.batchId),
    tenantIsolation("sms_messages"),
  ],
).enableRLS();

export type SmsMessage = typeof smsMessages.$inferSelect;
