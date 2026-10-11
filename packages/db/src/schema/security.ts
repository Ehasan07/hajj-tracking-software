import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Sign-in security, per person rather than per agency (a login can belong to
 * several agencies). Like the auth tables, these carry no tenant id.
 */

/**
 * A browser that proved, with a code sent to the user's email, that it may
 * sign in without being asked again. The browser holds one random token in a
 * signed cookie; only its SHA-256 is stored here. An office computer that
 * several logins use keeps the same token, with a row for each login.
 */
export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text().notNull(),
    label: text().notNull(),
    deviceType: text(),
    browser: text(),
    os: text(),
    ip: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex("trusted_devices_user_token_idx").on(t.userId, t.tokenHash),
    index("trusted_devices_user_idx").on(t.userId, t.revokedAt),
  ],
);

/**
 * One-time codes sent by email. `device`: a sign-in from a browser that isn't
 * trusted yet. `reset`: a password-reset request, logged only to enforce the
 * resend wait and the daily limit (Better Auth keeps that code itself).
 */
export const emailOtps = pgTable(
  "email_otps",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text().notNull(),
    codeHash: text(),
    attempts: integer().notNull().default(0),
    requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
    meta: jsonb().$type<Record<string, string>>().notNull().default({}),
  },
  (t) => [
    index("email_otps_user_idx").on(t.userId, t.purpose, t.requestedAt),
    check("email_otps_purpose", sql`${t.purpose} in ('device', 'reset')`),
  ],
);

export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type EmailOtp = typeof emailOtps.$inferSelect;
