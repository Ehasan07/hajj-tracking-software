import { assertMinor, type Currency } from "./money";

export const BUSINESS_UNITS = ["hajj", "medicine", "zamzam", "coffee", "supernova", "office"] as const;
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

export type Direction = "in" | "out";
export type Period = "day" | "month" | "year";

export const DEFAULT_TIME_ZONE = "Asia/Dhaka";

export interface LedgerLine {
  occurredAt: Date;
  unit: BusinessUnit;
  direction: Direction;
  amount: number;
  currency: Currency;
}

export interface Totals {
  in: number;
  out: number;
  net: number;
  count: number;
}

export interface StatementRow {
  period: string;
  currency: Currency;
  totals: Totals;
  byUnit: Partial<Record<BusinessUnit, Totals>>;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsIn(date: Date, timeZone: string) {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatterCache.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { year: parts.year!, month: parts.month!, day: parts.day! };
}

/** "2026-10-02", "2026-10" or "2026", as seen on the office wall clock. */
export function periodKey(date: Date, period: Period, timeZone = DEFAULT_TIME_ZONE): string {
  const { year, month, day } = partsIn(date, timeZone);
  if (period === "year") return year;
  if (period === "month") return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

function emptyTotals(): Totals {
  return { in: 0, out: 0, net: 0, count: 0 };
}

function addTo(totals: Totals, line: LedgerLine) {
  assertMinor(line.amount);
  if (line.amount < 0) throw new RangeError("Ledger amounts are positive; use direction for sign");
  if (line.direction === "in") totals.in += line.amount;
  else totals.out += line.amount;
  totals.net = totals.in - totals.out;
  totals.count += 1;
}

/**
 * Group ledger lines into statement rows. Currencies are never mixed in one
 * row; converting SAR to BDT is a reporting choice made by the caller.
 */
export function buildStatement(
  lines: Iterable<LedgerLine>,
  period: Period,
  timeZone = DEFAULT_TIME_ZONE,
): StatementRow[] {
  const rows = new Map<string, StatementRow>();
  for (const line of lines) {
    const key = periodKey(line.occurredAt, period, timeZone);
    const mapKey = `${key}|${line.currency}`;
    let row = rows.get(mapKey);
    if (!row) {
      row = { period: key, currency: line.currency, totals: emptyTotals(), byUnit: {} };
      rows.set(mapKey, row);
    }
    addTo(row.totals, line);
    addTo((row.byUnit[line.unit] ??= emptyTotals()), line);
  }
  return [...rows.values()].sort(
    (a, b) => a.period.localeCompare(b.period) || a.currency.localeCompare(b.currency),
  );
}

/** Running balance per row, starting from an opening balance. */
export function withRunningBalance(rows: readonly StatementRow[], opening: Partial<Record<Currency, number>> = {}) {
  const balance: Partial<Record<Currency, number>> = { ...opening };
  return rows.map((row) => {
    const openingBalance = balance[row.currency] ?? 0;
    const closingBalance = openingBalance + row.totals.net;
    balance[row.currency] = closingBalance;
    return { ...row, openingBalance, closingBalance };
  });
}

/** What a pilgrim still owes: package price minus everything received, never below zero for display. */
export function outstanding(packagePrice: number, payments: readonly number[], discounts: readonly number[] = []) {
  const paid = payments.reduce((a, b) => a + assertMinor(b), 0);
  const discount = discounts.reduce((a, b) => a + assertMinor(b), 0);
  const due = assertMinor(packagePrice) - discount - paid;
  return { paid, discount, due: Math.max(due, 0), overpaid: Math.max(-due, 0) };
}
