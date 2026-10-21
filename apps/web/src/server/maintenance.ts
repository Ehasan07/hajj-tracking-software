import "server-only";
import { sql } from "drizzle-orm";
import { describeError } from "@hajj/api/errors";
import { db } from "@hajj/db";
import { deleteObjects, listObjects } from "./storage";

/**
 * Housekeeping in the web server's own process, every six hours:
 * - sign-in records that have done their job are deleted (ended sessions,
 *   used or expired codes, browsers no longer trusted), so addresses and
 *   device details aren't kept longer than they're needed;
 * - stored files that nothing points at any more (a replaced logo, a removed
 *   photo, an upload that was never saved, an erased pilgrim's papers) are
 *   deleted once they are a day old.
 */

const EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_MS = 2 * 60 * 1000;
/** A file younger than this may belong to an upload still being saved. */
const GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_DELETES_PER_RUN = 2000;

const g = globalThis as unknown as { __hajjMaintenance?: NodeJS.Timeout; __hajjMaintenanceBusy?: boolean };

export async function purgeSignInRecords() {
  await db.execute(sql`delete from session where expires_at < now()`);
  await db.execute(sql`delete from email_otps where expires_at < now() - interval '1 day'`);
  await db.execute(sql`delete from trusted_devices where expires_at < now() or revoked_at < now() - interval '30 days'`);
  await db.execute(sql`delete from verification where expires_at < now()`);
}

/** Files under tenants/ that no record uses and that are older than a day. Returns how many were deleted. */
export async function removeUnusedFiles(now = Date.now()): Promise<number> {
  const rows = await db.execute<{ key: string }>(sql`select k as key from referenced_file_keys() k`);
  const used = new Set(rows.map((r) => r.key));
  const stored = await listObjects("tenants/");
  // If nothing at all is referenced while files exist, something is wrong with the lookup: delete nothing.
  if (used.size === 0 && stored.length > 0) {
    console.warn(`[maintenance] skipped file clean-up: no referenced files found, ${stored.length} stored`);
    return 0;
  }
  const unused = stored
    .filter((o) => !used.has(o.key) && now - o.modified.getTime() > GRACE_MS)
    .slice(0, MAX_DELETES_PER_RUN)
    .map((o) => o.key);
  await deleteObjects(unused);
  return unused.length;
}

async function run() {
  if (g.__hajjMaintenanceBusy) return;
  g.__hajjMaintenanceBusy = true;
  try {
    await purgeSignInRecords();
    const removed = await removeUnusedFiles();
    if (removed) console.info(`[maintenance] removed ${removed} unused files`);
  } catch (error) {
    console.error(`[maintenance] ${describeError(error)}`);
  } finally {
    g.__hajjMaintenanceBusy = false;
  }
}

export function startMaintenance() {
  if (g.__hajjMaintenance) return;
  g.__hajjMaintenance = setTimeout(function again() {
    void run();
    g.__hajjMaintenance = setTimeout(again, EVERY_MS);
  }, FIRST_RUN_MS);
}
