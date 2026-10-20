import "server-only";
import { and, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { checkPassword, codeSms, maskEmail, normalizeBdPhone, periodKey } from "@hajj/core";
import { db } from "@hajj/db";
import { emailOtps, user } from "@hajj/db/schema";
import { auth } from "./auth";
import { codeHash, newCode, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN, OTP_TTL_SECONDS, RESET_MAX_PER_DAY, sameCode } from "./device-otp";
import { sendSms, smsConfigured } from "./sms";

/**
 * Codes by SMS, with the same rules as the emailed ones: stored only as an
 * HMAC, 10 minutes, 5 tries, a new code after 45 seconds. On top of that a
 * number gets at most 5 codes a day, whoever asks, so the form can't be used
 * to flood someone's phone.
 *
 * `phone`: proves a mobile number belongs to the signed-in account.
 * `phone_reset`: a password reset by mobile; shares the daily limit with
 * resets by email.
 */

const CODES_PER_NUMBER_PER_DAY = 5;

export { smsConfigured };

/** Only Bangladeshi mobile numbers (+8801[3-9]…) can receive codes. */
export function mobileNumber(raw: string): string | null {
  const phone = normalizeBdPhone(raw);
  return phone && /^\+8801[3-9]\d{8}$/.test(phone) ? phone : null;
}

/** "+8801712345678" → "01712-•••678" */
export function maskPhone(phone: string): string {
  const local = phone.replace(/^\+88/, "");
  return `${local.slice(0, 5)}-•••${local.slice(-3)}`;
}

type Purpose = "phone" | "phone_reset";

export type SendResult = { ok: true; masked: string; resendIn: number } | { ok: false; reason: "invalid_phone" | "taken" | "wait" | "too_many" | "send_failed"; wait?: number };

async function codesToNumberToday(phone: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailOtps)
    .where(and(inArray(emailOtps.purpose, ["phone", "phone_reset"]), sql`${emailOtps.meta} ->> 'phone' = ${phone}`, gt(emailOtps.requestedAt, new Date(Date.now() - 864e5))));
  return row?.n ?? 0;
}

async function issue(userId: string, purpose: Purpose, phone: string): Promise<SendResult> {
  if ((await codesToNumberToday(phone)) >= CODES_PER_NUMBER_PER_DAY) return { ok: false, reason: "too_many" };
  const code = newCode();
  const [row] = await db
    .insert(emailOtps)
    .values({ userId, purpose, expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000), meta: { phone } })
    .returning({ id: emailOtps.id });
  await db.update(emailOtps).set({ codeHash: codeHash(row!.id, code) }).where(eq(emailOtps.id, row!.id));
  const sent = await sendSms(phone, codeSms(code, purpose === "phone" ? "verify" : "reset"));
  if (!sent.ok) {
    console.warn(`[sms] code to ${maskPhone(phone)} not sent: ${sent.error}`);
    await db.update(emailOtps).set({ consumedAt: new Date() }).where(eq(emailOtps.id, row!.id));
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true, masked: maskPhone(phone), resendIn: OTP_RESEND_COOLDOWN };
}

async function latest(userId: string, purpose: Purpose) {
  const [row] = await db
    .select()
    .from(emailOtps)
    .where(and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, purpose)))
    .orderBy(desc(emailOtps.requestedAt))
    .limit(1);
  return row ?? null;
}

function waitLeft(requestedAt: Date) {
  return Math.ceil(OTP_RESEND_COOLDOWN - (Date.now() - requestedAt.getTime()) / 1000);
}

/* ------------------------------------------------------- verify a number */

/** Text a code to the number the signed-in person wants on their account. */
export async function startPhoneVerification(userId: string, raw: string): Promise<SendResult> {
  const phone = mobileNumber(raw);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.phoneNumber, phone), eq(user.phoneNumberVerified, true), ne(user.id, userId)));
  if (taken) return { ok: false, reason: "taken" };
  const last = await latest(userId, "phone");
  if (last && !last.consumedAt && waitLeft(last.requestedAt) > 0) return { ok: false, reason: "wait", wait: waitLeft(last.requestedAt) };
  return issue(userId, "phone", phone);
}

export type CheckResult = { ok: true; phone: string } | { ok: false; reason: "invalid" | "expired" | "too_many" | "incorrect" | "taken"; remaining?: number };

/** Count a try against a code; on a match, optionally use it up. */
async function check(row: typeof emailOtps.$inferSelect | null, code: string, consume: boolean): Promise<CheckResult> {
  if (!row || row.consumedAt) return { ok: false, reason: "invalid" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  if (!/^\d{6}$/.test(code) || !sameCode(row.id, code, row.codeHash)) {
    const [updated] = await db
      .update(emailOtps)
      .set({ attempts: sql`${emailOtps.attempts} + 1` })
      .where(eq(emailOtps.id, row.id))
      .returning({ attempts: emailOtps.attempts });
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - (updated?.attempts ?? OTP_MAX_ATTEMPTS));
    return remaining === 0 ? { ok: false, reason: "too_many" } : { ok: false, reason: "incorrect", remaining };
  }
  if (consume) {
    const [used] = await db
      .update(emailOtps)
      .set({ consumedAt: new Date() })
      .where(and(eq(emailOtps.id, row.id), isNull(emailOtps.consumedAt)))
      .returning({ id: emailOtps.id });
    if (!used) return { ok: false, reason: "invalid" };
  }
  return { ok: true, phone: row.meta.phone ?? "" };
}

/** The code from the SMS: the number becomes the account's verified mobile. */
export async function confirmPhoneVerification(userId: string, code: string): Promise<CheckResult> {
  const result = await check(await latest(userId, "phone"), code, true);
  if (!result.ok) return result;
  try {
    // Another account may have verified the same number in the meantime; the unique index decides.
    await db.update(user).set({ phoneNumber: result.phone, phoneNumberVerified: true, updatedAt: new Date() }).where(eq(user.id, userId));
  } catch {
    return { ok: false, reason: "taken" };
  }
  return result;
}

/** The signed-in person's mobile, if they have proved one. */
export async function verifiedPhone(userId: string): Promise<string | null> {
  const [row] = await db.select({ phone: user.phoneNumber, verified: user.phoneNumberVerified }).from(user).where(eq(user.id, userId));
  return row?.verified && row.phone ? row.phone : null;
}

/* --------------------------------------------------- password reset by SMS */

async function resetUser(phone: string) {
  const [row] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(and(eq(user.phoneNumber, phone), eq(user.phoneNumberVerified, true)));
  return row ?? null;
}

/**
 * Text a reset code to an account's verified mobile. The answer is the same
 * whether or not an account has that number, or whether today's limit is
 * reached, so nobody can use it to find accounts.
 */
export async function startPhoneReset(raw: string): Promise<{ ok: true; resendIn: number } | { ok: false; reason: "invalid_phone" }> {
  const phone = mobileNumber(raw);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const same = { ok: true as const, resendIn: OTP_RESEND_COOLDOWN };
  const account = await resetUser(phone);
  if (!account) return same;
  const recent = await db
    .select({ requestedAt: emailOtps.requestedAt })
    .from(emailOtps)
    .where(and(eq(emailOtps.userId, account.id), inArray(emailOtps.purpose, ["reset", "phone_reset"]), gt(emailOtps.requestedAt, new Date(Date.now() - 2 * 864e5))))
    .orderBy(desc(emailOtps.requestedAt));
  if (recent[0] && waitLeft(recent[0].requestedAt) > 0) return same;
  const today = periodKey(new Date(), "day");
  if (recent.filter((r) => periodKey(r.requestedAt, "day") === today).length >= RESET_MAX_PER_DAY) return same;
  await issue(account.id, "phone_reset", phone);
  return same;
}

async function resetRow(phone: string) {
  const account = await resetUser(phone);
  if (!account) return { account: null, row: null };
  return { account, row: await latest(account.id, "phone_reset") };
}

/** Check the code before asking for a new password (a wrong one still counts as a try). */
export async function checkPhoneReset(raw: string, code: string): Promise<CheckResult> {
  const phone = mobileNumber(raw);
  if (!phone) return { ok: false, reason: "invalid" };
  const { row } = await resetRow(phone);
  // Same answer as a wrong code when the number has no account.
  if (!row) return { ok: false, reason: "incorrect", remaining: OTP_MAX_ATTEMPTS - 1 };
  const result = await check(row, code, false);
  return result.ok && result.phone !== phone ? { ok: false, reason: "invalid" } : result;
}

export type ResetResult =
  | { ok: true; userId: string; email: string; masked: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many" | "incorrect" | "taken" | "weak_password"; remaining?: number };

/** Set the new password with the code, sign every session out, and say which email to sign in with. */
export async function resetPasswordByPhone(raw: string, code: string, password: string): Promise<ResetResult> {
  const phone = mobileNumber(raw);
  if (!phone) return { ok: false, reason: "invalid" };
  const { account, row } = await resetRow(phone);
  if (!account || !row) return { ok: false, reason: "invalid" };
  if (!checkPassword(password, { name: account.name, email: account.email }).ok) return { ok: false, reason: "weak_password" };
  const result = await check(row, code, true);
  if (!result.ok) return result;
  const context = await auth.$context;
  await context.internalAdapter.updatePassword(account.id, await context.password.hash(password));
  await context.internalAdapter.deleteUserSessions(account.id);
  return { ok: true, userId: account.id, email: account.email, masked: maskEmail(account.email) };
}
