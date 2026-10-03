import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { BusinessUnit, Currency } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { expenses, ledgerEntries } from "@hajj/db/schema";
import { businessDate, getSettings } from "./tenant";

type Method = "cash" | "bkash" | "nagad" | "rocket" | "bank" | "card" | "other";

export interface ExpenseInput {
  unit: BusinessUnit;
  category: string;
  payee?: string;
  amount: number;
  currency: Currency;
  method: Method;
  reference?: string;
  note?: string;
  day: string;
  hotelBookingId?: string;
}

/** Money paid out: one expense row and its ledger entry, in the caller's transaction. */
export async function recordExpense(tx: Transaction, input: ExpenseInput) {
  const id = randomUUID();
  const now = new Date();
  const [entry] = await tx
    .insert(ledgerEntries)
    .values({
      unit: input.unit,
      direction: "out",
      amount: input.amount,
      currency: input.currency,
      businessDate: input.day,
      occurredAt: now,
      sourceType: "expense",
      sourceId: id,
      category: input.category,
      memo: [input.payee, input.note].filter(Boolean).join(" · ") || null,
    })
    .returning({ id: ledgerEntries.id });
  const [row] = await tx
    .insert(expenses)
    .values({
      id,
      unit: input.unit,
      category: input.category,
      payee: input.payee,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      reference: input.reference,
      note: input.note,
      spentAt: now,
      businessDate: input.day,
      hotelBookingId: input.hotelBookingId,
      ledgerEntryId: entry!.id,
    })
    .returning();
  return row!;
}

/** Cancel an expense: keep the row, post the reverse entry today. */
export async function voidExpense(tx: Transaction, id: string, reason: string) {
  const [row] = await tx.select().from(expenses).where(eq(expenses.id, id)).for("update");
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  if (row.voidedAt) throw new TRPCError({ code: "CONFLICT", message: "ALREADY_VOID" });
  const settings = await getSettings(tx);
  const now = new Date();
  const [reversal] = await tx
    .insert(ledgerEntries)
    .values({
      unit: row.unit,
      direction: "in",
      amount: row.amount,
      currency: row.currency,
      businessDate: businessDate(settings, now),
      occurredAt: now,
      sourceType: "expense_void",
      sourceId: row.id,
      category: row.category,
      memo: `VOID: ${reason}`,
      reversesId: row.ledgerEntryId,
    })
    .returning({ id: ledgerEntries.id });
  await tx
    .update(expenses)
    .set({ voidedAt: now, voidReason: reason, voidLedgerEntryId: reversal!.id })
    .where(eq(expenses.id, id));
  return { id };
}
