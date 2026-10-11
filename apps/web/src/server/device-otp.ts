import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { describeDevice, maskEmail, periodKey } from "@hajj/core";
import { db } from "@hajj/db";
import { emailOtps, trustedDevices, user } from "@hajj/db/schema";
import { clientIp } from "./client-ip";
import { alertEmail, codeEmail } from "./emails";
import { mailConfigured, sendMail } from "./mail";

/**
 * Email codes for signing in from a new device and for resetting a password,
 * with the same rules as MY-Card:
 *
 * - a new browser has to type a 6-digit code sent to the account's email;
 *   after that it is trusted for 90 days (signed cookie, revocable)
 * - a code lasts 10 minutes and allows 5 tries
 * - a new code can be asked for after 45 seconds
 * - at most 2 password resets a day per account
 *
 * Codes are stored only as an HMAC; the browser token only as a SHA-256.
 */

export const OTP_TTL_SECONDS = 600;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN = 45;
export const TRUST_DAYS = 90;
export const RESET_MAX_PER_DAY = 2;
/** New-device codes per account per hour; past this the latest code is kept and nothing more is sent. */
export const DEVICE_CODES_PER_HOUR = 10;
const RESENDS_PER_CHALLENGE = 5;

export const TRUST_COOKIE = "hajj.td";
export const PENDING_COOKIE = "hajj.dv";

const secret = () => {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
};

/** Needs a way to send the code; without one, sign-in works as before and a warning is logged. */
export function deviceCheckEnabled(): boolean {
  return mailConfigured() && process.env.DEVICE_CHECK !== "off";
}

/* ----------------------------------------------------------- signed values */

export function sign(value: string): string {
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const at = signed.lastIndexOf(".");
  if (at < 1) return null;
  const value = signed.slice(0, at);
  const expected = Buffer.from(createHmac("sha256", secret()).update(value).digest("base64url"));
  const given = Buffer.from(signed.slice(at + 1));
  return given.length === expected.length && timingSafeEqual(given, expected) ? value : null;
}

const codeHash = (id: string, code: string) => createHmac("sha256", secret()).update(`${id}:${code}`).digest("hex");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

function sameCode(id: string, code: string, stored: string | null) {
  if (!stored) return false;
  const a = Buffer.from(codeHash(id, code));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------------------------------------------------------------- devices */

export interface DeviceMeta {
  label: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
}

export function deviceMeta(headers: Headers): DeviceMeta {
  const info = describeDevice(headers.get("user-agent"));
  const ip = clientIp(headers) ?? "";
  return { label: info.label, deviceType: info.deviceType, browser: info.browser, os: info.os, ip };
}

/** The trusted device this browser's cookie points at, for this user — or null. Refreshes last seen. */
export async function trustedDeviceFor(userId: string, cookie: string | undefined | null, meta?: DeviceMeta) {
  const token = unsign(cookie);
  if (!token) return null;
  const [row] = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.tokenHash, tokenHash(token)),
        eq(trustedDevices.userId, userId),
        isNull(trustedDevices.revokedAt),
        gt(trustedDevices.expiresAt, new Date()),
      ),
    );
  if (!row) return null;
  await db
    .update(trustedDevices)
    .set({ lastSeenAt: new Date(), ...(meta?.ip ? { ip: meta.ip } : {}) })
    .where(eq(trustedDevices.id, row.id));
  return row;
}

/**
 * Trust this browser for this user. The browser keeps the token it already
 * has, so other logins trusted on it stay trusted. Returns the signed cookie
 * value to set.
 */
export async function trustDevice(userId: string, meta: DeviceMeta, cookie?: string | null): Promise<string> {
  const token = unsign(cookie) ?? randomBytes(32).toString("base64url");
  const fields = {
    label: meta.label,
    deviceType: meta.deviceType || null,
    browser: meta.browser || null,
    os: meta.os || null,
    ip: meta.ip || null,
    expiresAt: new Date(Date.now() + TRUST_DAYS * 864e5),
  };
  await db
    .insert(trustedDevices)
    .values({ userId, tokenHash: tokenHash(token), ...fields })
    .onConflictDoUpdate({
      target: [trustedDevices.userId, trustedDevices.tokenHash],
      set: { ...fields, createdAt: new Date(), lastSeenAt: new Date(), revokedAt: null },
    });
  return sign(token);
}

export const trustCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TRUST_DAYS * 86400,
};

export const pendingCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: OTP_TTL_SECONDS,
};

/* --------------------------------------------------------- device challenge */

async function emailCode(userId: string, code: string, purpose: "device" | "reset", device?: string) {
  const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId));
  if (!u) return;
  const result = await sendMail(codeEmail({ to: u.email, name: u.name, code, purpose, device, minutes: OTP_TTL_SECONDS / 60 }));
  if (!result.ok) console.warn(`Could not send the ${purpose} code to user ${userId}: ${result.error}`);
}

export interface ChallengeView {
  id: string;
  email: string;
  device: string;
  resendIn: number;
}

function view(row: typeof emailOtps.$inferSelect, email: string): ChallengeView {
  const elapsed = (Date.now() - row.requestedAt.getTime()) / 1000;
  return { id: row.id, email: maskEmail(email), device: row.meta.label ?? "", resendIn: Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN - elapsed)) };
}

/**
 * Start (or keep) the code check for a sign-in from an untrusted browser.
 * The same browser submitting the password again within the wait keeps the
 * code already sent (`pendingId` is the challenge its cookie points at).
 */
export async function startDeviceChallenge(userId: string, email: string, meta: DeviceMeta, pendingId?: string | null): Promise<ChallengeView> {
  const open = and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, "device"), isNull(emailOtps.consumedAt), gt(emailOtps.expiresAt, new Date()));
  if (pendingId) {
    const [mine] = await db.select().from(emailOtps).where(and(open, eq(emailOtps.id, pendingId)));
    if (mine && Date.now() - mine.requestedAt.getTime() < OTP_RESEND_COOLDOWN * 1000) return view(mine, email);
  }
  // Someone with the password can't use sign-in to flood the inbox.
  const [counted] = await db
    .select({ sent: sql<number>`coalesce(sum(coalesce((${emailOtps.meta} ->> 'sends')::int, 1)), 0)::int` })
    .from(emailOtps)
    .where(and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, "device"), gt(emailOtps.requestedAt, new Date(Date.now() - 3600_000))));
  if ((counted?.sent ?? 0) >= DEVICE_CODES_PER_HOUR) {
    const [latest] = await db.select().from(emailOtps).where(open).orderBy(desc(emailOtps.requestedAt)).limit(1);
    if (latest) return view(latest, email);
  }
  const code = newCode();
  const [row] = await db
    .insert(emailOtps)
    .values({ userId, purpose: "device", expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000), meta: { ...meta } })
    .returning();
  await db.update(emailOtps).set({ codeHash: codeHash(row!.id, code) }).where(eq(emailOtps.id, row!.id));
  await emailCode(userId, code, "device", meta.label);
  return view(row!, email);
}

async function pendingRow(challengeId: string) {
  const [row] = await db
    .select({ otp: emailOtps, email: user.email })
    .from(emailOtps)
    .innerJoin(user, eq(user.id, emailOtps.userId))
    .where(and(eq(emailOtps.id, challengeId), eq(emailOtps.purpose, "device"), isNull(emailOtps.consumedAt)));
  return row ?? null;
}

export async function describeChallenge(challengeId: string): Promise<ChallengeView | null> {
  const row = await pendingRow(challengeId);
  if (!row || row.otp.expiresAt < new Date()) return null;
  return view(row.otp, row.email);
}

export type VerifyResult =
  | { ok: true; userId: string; meta: DeviceMeta }
  | { ok: false; reason: "expired" | "too_many" | "incorrect" | "invalid"; remaining?: number };

export async function verifyDeviceChallenge(challengeId: string, code: string): Promise<VerifyResult> {
  const row = await pendingRow(challengeId);
  if (!row) return { ok: false, reason: "invalid" };
  const otp = row.otp;
  if (otp.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  if (!/^\d{6}$/.test(code) || !sameCode(otp.id, code, otp.codeHash)) {
    const [updated] = await db
      .update(emailOtps)
      .set({ attempts: sql`${emailOtps.attempts} + 1` })
      .where(eq(emailOtps.id, otp.id))
      .returning({ attempts: emailOtps.attempts });
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - (updated?.attempts ?? OTP_MAX_ATTEMPTS));
    return remaining === 0 ? { ok: false, reason: "too_many" } : { ok: false, reason: "incorrect", remaining };
  }
  // Consume exactly once, even if two requests race.
  const [consumed] = await db
    .update(emailOtps)
    .set({ consumedAt: new Date() })
    .where(and(eq(emailOtps.id, otp.id), isNull(emailOtps.consumedAt)))
    .returning({ id: emailOtps.id });
  if (!consumed) return { ok: false, reason: "invalid" };
  const m = otp.meta;
  return { ok: true, userId: otp.userId, meta: { label: m.label ?? "", deviceType: m.deviceType ?? "", browser: m.browser ?? "", os: m.os ?? "", ip: m.ip ?? "" } };
}

export async function resendDeviceChallenge(challengeId: string): Promise<{ ok: true; view: ChallengeView } | { ok: false; wait?: number }> {
  const row = await pendingRow(challengeId);
  if (!row) return { ok: false };
  const waited = (Date.now() - row.otp.requestedAt.getTime()) / 1000;
  if (waited < OTP_RESEND_COOLDOWN) return { ok: false, wait: Math.ceil(OTP_RESEND_COOLDOWN - waited) };
  // A few new codes per sign-in attempt; after that the password has to be entered again.
  const sends = Number(row.otp.meta.sends ?? 1);
  if (sends >= RESENDS_PER_CHALLENGE) return { ok: false };
  const code = newCode();
  const [updated] = await db
    .update(emailOtps)
    .set({
      codeHash: codeHash(row.otp.id, code),
      attempts: 0,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      meta: { ...row.otp.meta, sends: String(sends + 1) },
    })
    .where(eq(emailOtps.id, row.otp.id))
    .returning();
  await emailCode(row.otp.userId, code, "device", row.otp.meta.label);
  return { ok: true, view: view(updated!, row.email) };
}

/* ----------------------------------------------------------- password reset */

/**
 * Called before Better Auth makes a reset code. Returns false when this
 * request must be dropped quietly: asked again within 45 seconds, or the
 * account already used its two resets today. The caller answers "sent" either
 * way, so nobody can tell whether an account exists.
 */
export async function allowPasswordReset(email: string): Promise<boolean> {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase()));
  if (!u) return true; // Better Auth itself answers "sent" without sending anything
  const recent = await db
    .select({ requestedAt: emailOtps.requestedAt })
    .from(emailOtps)
    .where(and(eq(emailOtps.userId, u.id), eq(emailOtps.purpose, "reset"), gt(emailOtps.requestedAt, new Date(Date.now() - 2 * 864e5))))
    .orderBy(desc(emailOtps.requestedAt));
  if (recent[0] && Date.now() - recent[0].requestedAt.getTime() < OTP_RESEND_COOLDOWN * 1000) return false;
  const today = periodKey(new Date(), "day");
  if (recent.filter((r) => periodKey(r.requestedAt, "day") === today).length >= RESET_MAX_PER_DAY) return false;
  await db.insert(emailOtps).values({ userId: u.id, purpose: "reset", expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000) });
  return true;
}

export async function sendResetCode(email: string, code: string) {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase()));
  if (u) await emailCode(u.id, code, "reset");
}

/* ------------------------------------------------------------------ alerts */

export async function sendSecurityAlert(userId: string, kind: "device" | "password", meta?: DeviceMeta) {
  const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId));
  if (!u || !mailConfigured()) return;
  const result = await sendMail(alertEmail({ to: u.email, name: u.name, kind, device: meta?.label, ip: meta?.ip, at: new Date() }));
  if (!result.ok) console.warn(`Could not send the ${kind} alert to user ${userId}: ${result.error}`);
}

/* ---------------------------------------------------------- sign-in lockout */

/**
 * Five wrong passwords for one email from one address lock that pair out for
 * 15 minutes, as in MY-Card. Kept in memory: one web instance.
 */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

const lockKey = (ip: string, email: string) => `${ip}|${email.trim().toLowerCase()}`;

export function isLocked(ip: string, email: string): boolean {
  const entry = fails.get(lockKey(ip, email));
  if (!entry) return false;
  if (entry.until < Date.now()) {
    fails.delete(lockKey(ip, email));
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILS;
}

export function recordFailure(ip: string, email: string) {
  const key = lockKey(ip, email);
  const entry = fails.get(key);
  const now = Date.now();
  if (!entry || entry.until < now) fails.set(key, { count: 1, until: now + LOGIN_LOCK_MS });
  else entry.count += 1;
  if (fails.size > 20_000) for (const [k, v] of fails) if (v.until < now) fails.delete(k);
}

export function clearFailures(ip: string, email: string) {
  fails.delete(lockKey(ip, email));
}
