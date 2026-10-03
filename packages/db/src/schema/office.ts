import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentMethodEnum, pilgrims } from "./hajj";
import { businessUnitEnum, currencyEnum } from "./tenancy";
import { id, money, tenantId, tenantIsolation, timestamps } from "./_shared";

/* ------------------------------------------------------------- expenses */

/** Money going out: rent, bills, hotel and supplier payments. One ledger entry each. */
export const expenses = pgTable(
  "expenses",
  {
    id: uuid().primaryKey(),
    tenantId: tenantId(),
    unit: businessUnitEnum().notNull(),
    category: text().notNull(),
    payee: text(),
    amount: money().notNull(),
    currency: currencyEnum().notNull().default("BDT"),
    method: paymentMethodEnum().notNull(),
    reference: text(),
    spentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    businessDate: date().notNull(),
    note: text(),
    hotelBookingId: uuid(),
    ledgerEntryId: uuid().notNull(),
    voidedAt: timestamp({ withTimezone: true }),
    voidReason: text(),
    voidLedgerEntryId: uuid(),
    createdBy: text()
      .notNull()
      .default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expenses_day_idx").on(t.tenantId, t.businessDate),
    check("expenses_amount", sql`${t.amount} > 0`),
    tenantIsolation("expenses"),
  ],
).enableRLS();

/* -------------------------------------------------------------- payroll */

export interface PayLine {
  label: string;
  amount: number;
}

export const employees = pgTable(
  "employees",
  {
    id: id(),
    tenantId: tenantId(),
    name: text().notNull(),
    designation: text(),
    phone: text(),
    joinedOn: date(),
    basic: money().notNull(),
    allowances: jsonb().$type<PayLine[]>().notNull().default([]),
    payoutMethod: text(),
    accountNo: text(),
    notes: text(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [check("employees_basic", sql`${t.basic} >= 0`), tenantIsolation("employees")],
).enableRLS();

export const salarySheetStatusEnum = pgEnum("salary_sheet_status", ["draft", "locked", "paid"]);

/** One sheet per month. Draft: editable. Locked: figures fixed. Paid: posted to the ledger. */
export const salarySheets = pgTable(
  "salary_sheets",
  {
    id: id(),
    tenantId: tenantId(),
    month: text().notNull(),
    workingDays: integer().notNull().default(26),
    status: salarySheetStatusEnum().notNull().default("draft"),
    lockedAt: timestamp({ withTimezone: true }),
    lockedBy: text(),
    paidAt: timestamp({ withTimezone: true }),
    ledgerEntryId: uuid(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("salary_sheets_month_idx").on(t.tenantId, t.month),
    check("salary_sheets_month", sql`${t.month} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    check("salary_sheets_days", sql`${t.workingDays} between 1 and 31`),
    tenantIsolation("salary_sheets"),
  ],
).enableRLS();

export const salaryLines = pgTable(
  "salary_lines",
  {
    id: id(),
    tenantId: tenantId(),
    sheetId: uuid()
      .notNull()
      .references(() => salarySheets.id, { onDelete: "cascade" }),
    employeeId: uuid()
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    basic: money().notNull(),
    allowances: jsonb().$type<PayLine[]>().notNull().default([]),
    deductions: jsonb().$type<PayLine[]>().notNull().default([]),
    unpaidAbsentDays: integer().notNull().default(0),
    overtimeHours: numeric({ precision: 6, scale: 2 }).notNull().default("0"),
    overtimeRate: money().notNull().default(0),
    advanceRecovery: money().notNull().default(0),
    gross: money().notNull(),
    totalDeductions: money().notNull(),
    net: money().notNull(),
    note: text(),
  },
  (t) => [
    uniqueIndex("salary_lines_employee_idx").on(t.sheetId, t.employeeId),
    tenantIsolation("salary_lines"),
  ],
).enableRLS();

/** Advance given to an employee; recovered later through salary lines. */
export const employeeAdvances = pgTable(
  "employee_advances",
  {
    id: uuid().primaryKey(),
    tenantId: tenantId(),
    employeeId: uuid()
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    amount: money().notNull(),
    givenOn: date().notNull(),
    method: paymentMethodEnum().notNull(),
    note: text(),
    ledgerEntryId: uuid().notNull(),
    createdBy: text()
      .notNull()
      .default(sql`current_setting('app.user_id', true)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("employee_advances_amount", sql`${t.amount} > 0`),
    tenantIsolation("employee_advances"),
  ],
).enableRLS();

/* --------------------------------------------------------------- hotels */

export const hotelCityEnum = pgEnum("hotel_city", ["makkah", "madinah", "other"]);
export const roomTypeEnum = pgEnum("room_type", ["double", "triple", "quad", "quint"]);
export const bookingStatusEnum = pgEnum("booking_status", ["tentative", "confirmed", "cancelled"]);

export const hotels = pgTable(
  "hotels",
  {
    id: id(),
    tenantId: tenantId(),
    name: text().notNull(),
    city: hotelCityEnum().notNull(),
    address: text(),
    distance: text(),
    phone: text(),
    notes: text(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [tenantIsolation("hotels")],
).enableRLS();

/** A block of rooms bought from a hotel for a date range. */
export const hotelBookings = pgTable(
  "hotel_bookings",
  {
    id: id(),
    tenantId: tenantId(),
    ref: text().notNull(),
    hotelId: uuid()
      .notNull()
      .references(() => hotels.id, { onDelete: "restrict" }),
    checkIn: date().notNull(),
    checkOut: date().notNull(),
    roomType: roomTypeEnum().notNull(),
    rooms: integer().notNull(),
    /** Price per room per night. */
    rate: money().notNull(),
    currency: currencyEnum().notNull().default("SAR"),
    total: money().notNull(),
    supplier: text(),
    status: bookingStatusEnum().notNull().default("tentative"),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("hotel_bookings_ref_idx").on(t.tenantId, t.ref),
    check("hotel_bookings_dates", sql`${t.checkOut} > ${t.checkIn}`),
    check("hotel_bookings_rooms", sql`${t.rooms} > 0 and ${t.rate} >= 0 and ${t.total} >= 0`),
    tenantIsolation("hotel_bookings"),
  ],
).enableRLS();

/** Which pilgrim sleeps in which room of a booking. */
export const roomAssignments = pgTable(
  "room_assignments",
  {
    id: id(),
    tenantId: tenantId(),
    bookingId: uuid()
      .notNull()
      .references(() => hotelBookings.id, { onDelete: "cascade" }),
    roomNo: text().notNull(),
    pilgrimId: uuid()
      .notNull()
      .references(() => pilgrims.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("room_assignments_pilgrim_idx").on(t.bookingId, t.pilgrimId),
    tenantIsolation("room_assignments"),
  ],
).enableRLS();

/** Which shops a shop-operator login may open. Owners and admins see everything. */
export const memberUnits = pgTable(
  "member_units",
  {
    tenantId: tenantId(),
    userId: text().notNull(),
    units: businessUnitEnum().array().notNull(),
  },
  (t) => [
    uniqueIndex("member_units_user_idx").on(t.tenantId, t.userId),
    tenantIsolation("member_units"),
  ],
).enableRLS();

export type Employee = typeof employees.$inferSelect;
export type SalarySheet = typeof salarySheets.$inferSelect;
export type SalaryLine = typeof salaryLines.$inferSelect;
export type Hotel = typeof hotels.$inferSelect;
export type HotelBooking = typeof hotelBookings.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
