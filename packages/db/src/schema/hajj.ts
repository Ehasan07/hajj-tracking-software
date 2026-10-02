import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencyEnum } from "./tenancy";
import { id, money, tenantId, tenantIsolation, timestamps } from "./_shared";

export const packageKindEnum = pgEnum("package_kind", ["hajj", "umrah"]);
export const inquiryInterestEnum = pgEnum("inquiry_interest", ["hajj", "umrah", "other"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "follow_up", "converted", "closed"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const pilgrimStatusEnum = pgEnum("pilgrim_status", [
  "registered",
  "documents",
  "visa",
  "ready",
  "travelled",
  "completed",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"]);
export const articleCategoryEnum = pgEnum("article_category", ["hajj", "umrah", "documents", "costs", "health", "faq"]);

/** What the agency sells this season. Price is copied onto each pilgrim at registration. */
export const travelPackages = pgTable(
  "travel_packages",
  {
    id: id(),
    tenantId: tenantId(),
    kind: packageKindEnum().notNull(),
    name: text().notNull(),
    season: text().notNull(),
    price: money().notNull(),
    currency: currencyEnum().notNull().default("BDT"),
    days: integer(),
    notes: text(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check("travel_packages_price_positive", sql`${t.price} > 0`),
    index("travel_packages_tenant_idx").on(t.tenantId, t.active),
    tenantIsolation("travel_packages"),
  ],
).enableRLS();

/** A person who came to the office or called to ask. Kept short on purpose. */
export const inquiries = pgTable(
  "inquiries",
  {
    id: id(),
    tenantId: tenantId(),
    ref: text().notNull(),
    name: text().notNull(),
    phone: text().notNull(),
    interest: inquiryInterestEnum().notNull().default("hajj"),
    packageId: uuid().references(() => travelPackages.id, { onDelete: "set null" }),
    partySize: integer().notNull().default(1),
    notes: text(),
    status: inquiryStatusEnum().notNull().default("new"),
    followUpOn: date(),
    convertedPilgrimId: uuid(),
    createdBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("inquiries_ref_idx").on(t.tenantId, t.ref),
    index("inquiries_status_idx").on(t.tenantId, t.status, t.followUpOn),
    index("inquiries_phone_idx").on(t.tenantId, t.phone),
    check("inquiries_party_size", sql`${t.partySize} between 1 and 100`),
    tenantIsolation("inquiries"),
  ],
).enableRLS();

/**
 * A confirmed pilgrim. The passport number is never stored in clear text:
 * `passportNumberEnc` holds AES-GCM ciphertext and `passportIndex` a keyed
 * hash used for exact search.
 */
export const pilgrims = pgTable(
  "pilgrims",
  {
    id: id(),
    tenantId: tenantId(),
    ref: text().notNull(),
    fullName: text().notNull(),
    fatherName: text(),
    phone: text().notNull(),
    altPhone: text(),
    email: text(),
    gender: genderEnum(),
    dateOfBirth: date(),
    address: text(),
    district: text(),
    passportNumberEnc: text(),
    passportIndex: text(),
    passportLast2: text(),
    passportExpiry: date(),
    nationality: text().default("BGD"),
    passportScanKey: text(),
    packageId: uuid().references(() => travelPackages.id, { onDelete: "restrict" }),
    packagePrice: money().notNull().default(0),
    discount: money().notNull().default(0),
    currency: currencyEnum().notNull().default("BDT"),
    status: pilgrimStatusEnum().notNull().default("registered"),
    emergencyName: text(),
    emergencyPhone: text(),
    notes: text(),
    inquiryId: uuid().references(() => inquiries.id, { onDelete: "set null" }),
    createdBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pilgrims_ref_idx").on(t.tenantId, t.ref),
    // Not unique: the same person may register again next season. The API warns on duplicates.
    index("pilgrims_passport_idx").on(t.tenantId, t.passportIndex),
    index("pilgrims_phone_idx").on(t.tenantId, t.phone),
    index("pilgrims_name_trgm_idx").using("gin", sql`${t.fullName} gin_trgm_ops`),
    index("pilgrims_package_idx").on(t.tenantId, t.packageId),
    check("pilgrims_amounts", sql`${t.packagePrice} >= 0 and ${t.discount} >= 0 and ${t.discount} <= ${t.packagePrice}`),
    tenantIsolation("pilgrims"),
  ],
).enableRLS();

/**
 * Money received from a pilgrim. Each row has exactly one ledger entry. Rows
 * are never deleted; a void keeps the row, records who and why, and posts a
 * reversing ledger entry. A trigger blocks edits to the money fields.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey(),
    tenantId: tenantId(),
    receiptNo: text().notNull(),
    pilgrimId: uuid()
      .notNull()
      .references(() => pilgrims.id, { onDelete: "restrict" }),
    amount: money().notNull(),
    currency: currencyEnum().notNull(),
    method: paymentMethodEnum().notNull(),
    reference: text(),
    purpose: text(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    businessDate: date().notNull(),
    receivedBy: text().notNull().default(sql`current_setting('app.user_id', true)`),
    ledgerEntryId: uuid().notNull(),
    verifyToken: text().notNull(),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: text(),
    voidReason: text(),
    voidLedgerEntryId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_receipt_idx").on(t.tenantId, t.receiptNo),
    uniqueIndex("payments_verify_idx").on(t.verifyToken),
    index("payments_pilgrim_idx").on(t.tenantId, t.pilgrimId),
    index("payments_date_idx").on(t.tenantId, t.businessDate),
    check("payments_amount_positive", sql`${t.amount} > 0`),
    check(
      "payments_void_complete",
      sql`(${t.voidedAt} is null) = (${t.voidReason} is null) and (${t.voidedAt} is null) = (${t.voidLedgerEntryId} is null)`,
    ),
    tenantIsolation("payments"),
  ],
).enableRLS();

/** Hajj and Umrah guidance shown on the public site and in the pilgrim app, in both languages. */
export const articles = pgTable(
  "articles",
  {
    id: id(),
    tenantId: tenantId(),
    slug: text().notNull(),
    category: articleCategoryEnum().notNull(),
    titleBn: text().notNull(),
    titleEn: text().notNull(),
    bodyBn: text().notNull(),
    bodyEn: text().notNull(),
    published: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.tenantId, t.slug),
    index("articles_list_idx").on(t.tenantId, t.category, t.sortOrder),
    tenantIsolation("articles"),
  ],
).enableRLS();

export type TravelPackage = typeof travelPackages.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type Pilgrim = typeof pilgrims.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Article = typeof articles.$inferSelect;
