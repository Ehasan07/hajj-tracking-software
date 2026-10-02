import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businessUnitEnum } from "./tenancy";
import { organization, user } from "./auth";
import { appRole, money } from "./_shared";

/**
 * The SaaS layer: who runs the platform, what is for sale, and which plan
 * each agency is on. Cross-agency reads go through SECURITY DEFINER
 * functions (see the platform migration) that check the caller is a
 * platform admin; nothing here loosens row level security for agencies.
 */

/** People who operate the platform itself. The app role cannot read this table directly. */
export const platformAdmins = pgTable("platform_admins", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export interface PlanLimits {
  /** Pilgrims registered per calendar year; null means unlimited. */
  pilgrimsPerYear: number | null;
  staffSeats: number | null;
  smsPerMonth: number | null;
}

/** What is for sale. Readable by everyone (pricing page); changed only by platform admins through the API. */
export const plans = pgTable("plans", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  nameBn: text().notNull(),
  nameEn: text().notNull(),
  taglineBn: text().notNull().default(""),
  taglineEn: text().notNull().default(""),
  priceMonthly: money().notNull(),
  priceYearly: money().notNull(),
  limits: jsonb().$type<PlanLimits>().notNull(),
  units: businessUnitEnum().array().notNull(),
  customDomain: boolean().notNull().default(false),
  sortOrder: integer().notNull().default(0),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "past_due", "suspended", "cancelled"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

/**
 * One row per agency. An agency can read its own row (to show its plan and
 * enforce limits); only platform admins change it, through
 * platform_set_subscription().
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    tenantId: text()
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: uuid()
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum().notNull().default("trial"),
    cycle: billingCycleEnum().notNull().default("monthly"),
    trialEndsAt: timestamp({ withTimezone: true }),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("subscriptions_read_own", {
      as: "permissive",
      for: "select",
      to: appRole,
      using: sql`${t.tenantId} = current_setting('app.tenant_id', true)`,
    }),
  ],
).enableRLS();

export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
