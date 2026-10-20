import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@hajj/db";
import { sendSms, smsConfigured } from "./sms";

/**
 * Sends the queued SMS (receipts and notices) a few at a time, every few
 * seconds, in the web server's own process. The database hands each message
 * to exactly one sender (`sms_claim`), so running more than one server is safe.
 */

const EVERY_MS = 5_000;
const BATCH = 20;
const g = globalThis as unknown as { __hajjSmsTimer?: NodeJS.Timeout; __hajjSmsBusy?: boolean };

async function tick() {
  if (g.__hajjSmsBusy || !smsConfigured()) return;
  g.__hajjSmsBusy = true;
  try {
    const rows = (await db.execute(sql`select * from sms_claim(${BATCH})`)) as unknown as { id: string; to_phone: string; body: string }[];
    for (const row of rows) {
      const result = await sendSms(row.to_phone, row.body);
      await db.execute(sql`select sms_finish(${row.id}::uuid, ${result.ok}, ${result.ref ?? null}, ${result.error ?? null})`);
    }
  } catch (error) {
    console.error("[sms] dispatcher", error);
  } finally {
    g.__hajjSmsBusy = false;
  }
}

export function startSmsDispatcher() {
  if (g.__hajjSmsTimer) return;
  g.__hajjSmsTimer = setInterval(() => void tick(), EVERY_MS);
  g.__hajjSmsTimer.unref?.();
}
