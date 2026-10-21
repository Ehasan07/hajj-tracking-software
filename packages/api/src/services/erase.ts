import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "@hajj/db";

/**
 * Erasing a person's details on request. The record itself stays where the
 * books need it (payments, sales, salaries); what identifies the person goes,
 * from the row, from its audit-trail copies, and from ledger notes and SMS that
 * quoted it. Each erase is itself written to the audit trail.
 */

/** Shown wherever an erased person's name used to be. */
export const ERASED_NAME = "—";

const textArray = (values: string[]): SQL =>
  values.length ? sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]` : sql`'{}'::text[]`;

/** Audit-trail copies of these rows keep when and who, not what they said. */
export async function eraseAudit(tx: Transaction, table: string, ids: string[]) {
  if (ids.length) await tx.execute(sql`select erase_audit(${table}, ${textArray(ids)})`);
}

/** Text messages sent to these numbers lose the number and the text. */
export async function eraseSms(tx: Transaction, phones: (string | null | undefined)[]) {
  const list = [...new Set(phones.filter((p): p is string => Boolean(p)))];
  if (list.length) await tx.execute(sql`select erase_sms(${textArray(list)})`);
}

/** Ledger notes from these entries' sources lose the name. */
export async function eraseLedgerMemos(tx: Transaction, sourceType: string, sourceIds: string[], name: string) {
  if (sourceIds.length && name && name !== ERASED_NAME) {
    await tx.execute(sql`select erase_ledger_memos(${sourceType}, ${textArray(sourceIds)}, ${name})`);
  }
}

export async function recordErase(tx: Transaction, table: string, id: string) {
  await tx.execute(sql`select record_access(${table}, ${id}, 'ERASE_PERSONAL_DATA')`);
}
