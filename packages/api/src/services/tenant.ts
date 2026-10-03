import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { daysUntil, formatReference, periodKey, type IdKind } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { tenantSettings, type TenantSettings } from "@hajj/db/schema";
import type { Role } from "../trpc";

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
  medicineSale: "MD",
  zamzamSale: "ZM",
  coffeeSale: "NC",
  supernovaSale: "SN",
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

/** How far back a manager may date an entry made late (a delivery written up next morning). */
const BACKDATE_DAYS = 31;

/**
 * The business day an entry belongs to. Today by default; owners, admins and
 * accountants may choose an earlier day within a month. Never a future day.
 */
export function entryDate(settings: TenantSettings, role: Role, requested?: string): string {
  const today = businessDate(settings);
  if (!requested || requested === today) return today;
  if (requested > today) throw new TRPCError({ code: "BAD_REQUEST", message: "FUTURE_DATE" });
  if (!["owner", "admin", "accountant"].includes(role))
    throw new TRPCError({ code: "FORBIDDEN", message: "BACKDATE_NOT_ALLOWED" });
  if (daysUntil(today, requested) > BACKDATE_DAYS)
    throw new TRPCError({ code: "BAD_REQUEST", message: "BACKDATE_TOO_OLD" });
  return requested;
}
