import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { smsSize } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { plans, smsMessages, subscriptions } from "@hajj/db/schema";

/**
 * Whether this server can actually send SMS. Without a provider the
 * messages are recorded as skipped instead of piling up to go out late.
 * The local file outbox counts only when the app runs on this machine.
 */
export function smsAvailable(): boolean {
  if (process.env.SMS_PROVIDER) return true;
  if (process.env.SMS_TRANSPORT !== "file") return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.BETTER_AUTH_URL ?? "").hostname);
  } catch {
    return false;
  }
}

/** Parts used this calendar month (Dhaka time) against the plan's allowance; null limit = unlimited. */
export async function smsQuota(tx: Transaction) {
  const [plan] = await tx
    .select({ limits: plans.limits })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .limit(1);
  const monthStart = sql`date_trunc('month', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka'`;
  const [row] = await tx
    .select({ used: sql<number>`coalesce(sum(${smsMessages.parts}), 0)::int` })
    .from(smsMessages)
    .where(and(gte(smsMessages.createdAt, monthStart), inArray(smsMessages.status, ["queued", "sending", "sent"])));
  const limit = plan?.limits.smsPerMonth ?? null;
  const used = row?.used ?? 0;
  return { limit, used, remaining: limit == null ? null : Math.max(0, limit - used) };
}

export interface OutgoingSms {
  kind: "receipt" | "notice";
  toPhone: string;
  body: string;
  batchId?: string;
  sourceId?: string;
}

/**
 * Record messages to send. Each is queued while the month's allowance lasts;
 * past it, it is kept as "skipped" so the agency can see what didn't go.
 * With no SMS set up on the server nothing is recorded at all.
 */
export async function enqueueSms(tx: Transaction, messages: OutgoingSms[]) {
  if (messages.length === 0 || !smsAvailable()) return { queued: 0, skipped: messages.length };
  let remaining = (await smsQuota(tx)).remaining;
  let queued = 0;
  const rows = messages.map((m) => {
    const parts = Math.min(10, Math.max(1, smsSize(m.body).parts));
    const fits = remaining == null || remaining >= parts;
    if (fits) {
      if (remaining != null) remaining -= parts;
      queued++;
    }
    return {
      ...m,
      parts,
      status: fits ? "queued" : "skipped",
      error: fits ? null : "monthly SMS allowance used up",
    };
  });
  for (let i = 0; i < rows.length; i += 500) await tx.insert(smsMessages).values(rows.slice(i, i + 500));
  return { queued, skipped: rows.length - queued };
}
