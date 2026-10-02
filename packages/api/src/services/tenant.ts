import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { formatReference, periodKey, type IdKind } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { tenantSettings, type TenantSettings } from "@hajj/db/schema";

export async function getSettings(tx: Transaction): Promise<TenantSettings> {
  const [row] = await tx.select().from(tenantSettings).limit(1);
  if (!row) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AGENCY_NOT_SET_UP" });
  return row;
}

/** Fixed prefixes for documents; pilgrims use the agency's own prefix. */
const DOC_PREFIX: Partial<Record<IdKind, string>> = {
  receipt: "MR",
  inquiry: "IQ",
  salarySheet: "SS",
  sale: "SL",
  booking: "HB",
};

/** Calendar date on the agency's wall clock, e.g. "2026-10-02". */
export function businessDate(settings: TenantSettings, at = new Date()): string {
  return periodKey(at, "day", settings.timeZone);
}

export async function nextReference(
  tx: Transaction,
  settings: TenantSettings,
  kind: IdKind,
  at = new Date(),
): Promise<string> {
  const year = Number(periodKey(at, "year", settings.timeZone));
  const [row] = await tx.execute<{ n: number }>(sql`select next_reference(${kind}, ${year}) as n`);
  const prefix = kind === "pilgrim" ? settings.referencePrefix : DOC_PREFIX[kind]!;
  return formatReference({ prefix, year, sequence: Number(row!.n) });
}
