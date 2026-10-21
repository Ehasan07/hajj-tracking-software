import { eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "@hajj/db";
import { account, emailOtps, session, trustedDevices, twoFactor, user } from "@hajj/db/schema";
import { ERASED_NAME } from "./erase";

/**
 * Erase a login: the password and every way in (sessions, trusted browsers,
 * codes, two-factor) are deleted, and the name, email and mobile are replaced.
 * The user row itself stays, so the receipts, sales and audit entries that
 * name it as the person who did them still point somewhere.
 * A platform admin is never erased this way.
 */
export async function eraseLogin(db: Database | Transaction, userId: string): Promise<boolean> {
  const [admin] = await db.execute<{ yes: boolean }>(sql`select user_is_platform_admin(${userId}) as yes`);
  if (admin?.yes) return false;
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
  await db.delete(emailOtps).where(eq(emailOtps.userId, userId));
  await db.delete(twoFactor).where(eq(twoFactor.userId, userId));
  await db
    .update(user)
    .set({
      name: ERASED_NAME,
      email: `erased-${userId}@erased.invalid`,
      emailVerified: false,
      image: null,
      phoneNumber: null,
      phoneNumberVerified: false,
      twoFactorEnabled: false,
    })
    .where(eq(user.id, userId));
  return true;
}
