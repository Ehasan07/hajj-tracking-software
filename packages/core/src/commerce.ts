import { assertMinor, sum } from "./money";

/* ----------------------------------------------------------------- sales */

export interface CartLine {
  qty: number;
  unitPrice: number;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
}

/** Totals for a cart. Quantities are whole units; amounts are minor units. */
export function saleTotals(lines: readonly CartLine[], discount = 0, paid?: number): SaleTotals {
  if (lines.length === 0) throw new RangeError("EMPTY_CART");
  const subtotal = sum(
    lines.map((l) => {
      if (!Number.isInteger(l.qty) || l.qty <= 0) throw new RangeError("INVALID_QTY");
      return assertMinor(l.unitPrice, "unitPrice") * l.qty;
    }),
  );
  assertMinor(discount, "discount");
  if (discount < 0 || discount > subtotal) throw new RangeError("INVALID_DISCOUNT");
  const total = subtotal - discount;
  const received = paid === undefined ? total : assertMinor(paid, "paid");
  if (received < 0 || received > total) throw new RangeError("INVALID_PAID");
  return { subtotal, discount, total, paid: received, due: total - received };
}

/* --------------------------------------------------------------- batches */

export interface BatchStock {
  id: string;
  expiresOn: string;
  qty: number;
}

/**
 * Take `qty` from batches, earliest expiry first (FEFO). Expired batches are
 * never sold. Throws when the unexpired stock is not enough.
 */
export function pickBatches(batches: readonly BatchStock[], qty: number, today: string) {
  if (!Number.isInteger(qty) || qty <= 0) throw new RangeError("INVALID_QTY");
  const usable = batches
    .filter((b) => b.qty > 0 && b.expiresOn >= today)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id));
  const picks: { batchId: string; qty: number }[] = [];
  let left = qty;
  for (const b of usable) {
    if (left === 0) break;
    const take = Math.min(b.qty, left);
    picks.push({ batchId: b.id, qty: take });
    left -= take;
  }
  if (left > 0) throw new RangeError("OUT_OF_STOCK");
  return picks;
}

/** Days from `today` until a batch expires; negative once expired. Dates are "YYYY-MM-DD". */
export function daysUntil(dateKey: string, today: string): number {
  return Math.round(
    (Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5,
  );
}

/* ------------------------------------------------------------- customers */

/** What a shop owes: due carried over, plus unpaid parts of sales, minus later payments. */
export function customerBalance(
  openingDue: number,
  sales: readonly { total: number; paid: number }[],
  payments: readonly number[],
) {
  const billed = sum(sales.map((s) => assertMinor(s.total) - assertMinor(s.paid)));
  const received = sum(payments.map((p) => assertMinor(p)));
  return assertMinor(openingDue) + billed - received;
}

/* ---------------------------------------------------------------- routes */

/** 0 = Sunday … 6 = Saturday for a calendar date "YYYY-MM-DD". */
export function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

/** Bangladeshi offices count the week from Saturday; route numbers follow that order. */
export const ROUTE_WEEK = [6, 0, 1, 2, 3, 4, 5] as const;

/** Route number shown to people (1-7, Saturday first) for a JavaScript weekday. */
export function routeNumber(weekday: number): number {
  return ROUTE_WEEK.indexOf(weekday as (typeof ROUTE_WEEK)[number]) + 1;
}

/** Shift a date key by whole days. */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- hotels */

export const ROOM_CAPACITY = { double: 2, triple: 3, quad: 4, quint: 5 } as const;
export type RoomType = keyof typeof ROOM_CAPACITY;

export function nights(checkIn: string, checkOut: string): number {
  const n = daysUntil(checkOut, checkIn);
  if (n <= 0) throw new RangeError("INVALID_DATES");
  return n;
}

/** Rooms × nights × rate per room per night. */
export function bookingTotal(input: {
  checkIn: string;
  checkOut: string;
  rooms: number;
  rate: number;
}): number {
  if (!Number.isInteger(input.rooms) || input.rooms <= 0) throw new RangeError("INVALID_ROOMS");
  return assertMinor(input.rate, "rate") * input.rooms * nights(input.checkIn, input.checkOut);
}

/* ---------------------------------------------------------------- months */

/** "2026-10" → first and last calendar day. */
export function monthRange(month: string): { from: string; to: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("INVALID_MONTH");
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** "2026-10-03" → its period range for a day, month ("2026-10") or year ("2026"). */
export function periodRange(key: string): {
  from: string;
  to: string;
  period: "day" | "month" | "year";
} {
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return { from: key, to: key, period: "day" };
  if (/^\d{4}-\d{2}$/.test(key)) return { ...monthRange(key), period: "month" };
  if (/^\d{4}$/.test(key)) return { from: `${key}-01-01`, to: `${key}-12-31`, period: "year" };
  throw new RangeError("INVALID_PERIOD");
}
