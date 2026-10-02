import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@hajj/db";

export type VerifiedReceipt = {
  receipt_no: string;
  amount: number;
  currency: "BDT" | "SAR";
  received_at: string;
  voided: boolean;
  agency: string;
  pilgrim_ref: string;
  pilgrim_name: string;
};

/** Public lookup behind the QR code. The database function returns only what is printed on the receipt. */
export async function verifyReceipt(token: string): Promise<VerifiedReceipt | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const rows = await db.execute<VerifiedReceipt>(sql`select * from verify_receipt(${token})`);
  const row = rows[0];
  return row ? { ...row, amount: Number(row.amount) } : null;
}
