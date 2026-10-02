/**
 * Money is always stored and calculated in minor units (paisa for BDT,
 * halala for SAR) as safe integers. Floats never touch a balance.
 */

export const CURRENCIES = ["BDT", "SAR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Both supported currencies have 100 minor units per major unit. */
export const MINOR_PER_MAJOR = 100;

/** Exchange rates are stored as integers scaled by this factor (6 decimal places). */
export const RATE_SCALE = 1_000_000;

export class MoneyError extends Error {
  override name = "MoneyError";
}

export function assertMinor(value: number, label = "amount"): number {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a safe integer in minor units, got ${value}`);
  }
  return value;
}

/**
 * Parse a user-typed amount ("12,500.5", "১২৫০০.৫০") into minor units.
 * Rejects more than two decimal places instead of silently rounding.
 */
export function parseAmount(input: string): number {
  const normalized = toLatinDigits(input).replace(/[,\s_]/g, "").trim();
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new MoneyError(`Invalid amount: "${input}"`);
  const [, sign, whole = "0", fraction = ""] = match;
  const minor = Number(whole) * MINOR_PER_MAJOR + Number(fraction.padEnd(2, "0"));
  return assertMinor(sign ? -minor : minor);
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += assertMinor(value);
  return assertMinor(total, "sum");
}

/** Round half away from zero, the convention used on printed receipts. */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Multiply an amount by a ratio (numerator / denominator) using integer math. */
export function mulDiv(amount: number, numerator: number, denominator: number): number {
  assertMinor(amount);
  if (denominator === 0) throw new MoneyError("Division by zero");
  const product = BigInt(amount) * BigInt(numerator);
  const d = BigInt(denominator);
  const negative = product < 0n !== d < 0n;
  const absProduct = product < 0n ? -product : product;
  const absD = d < 0n ? -d : d;
  let quotient = absProduct / absD;
  if ((absProduct % absD) * 2n >= absD) quotient += 1n;
  return assertMinor(Number(negative ? -quotient : quotient), "result");
}

/** Convert using a rate stored as integer × RATE_SCALE (e.g. 1 SAR = 32.45 BDT → 32_450_000). */
export function convert(amount: number, scaledRate: number): number {
  return mulDiv(amount, scaledRate, RATE_SCALE);
}

export function parseRate(input: string): number {
  const normalized = toLatinDigits(input).trim();
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(normalized);
  if (!match) throw new MoneyError(`Invalid exchange rate: "${input}"`);
  const [, whole = "0", fraction = ""] = match;
  return Number(whole) * RATE_SCALE + Number(fraction.padEnd(6, "0"));
}

/**
 * Split an amount into parts proportional to weights without losing a paisa.
 * The leftover from rounding goes to the largest remainders first.
 */
export function allocate(amount: number, weights: readonly number[]): number[] {
  assertMinor(amount);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || totalWeight <= 0) {
    throw new MoneyError("allocate needs at least one positive weight");
  }
  const raw = weights.map((w) => (amount * w) / totalWeight);
  const parts = raw.map((r) => Math.trunc(r));
  let leftover = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, rem: Math.abs(r - Math.trunc(r)) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  const step = Math.sign(leftover);
  for (let k = 0; leftover !== 0; k = (k + 1) % order.length) {
    parts[order[k]!.i]! += step;
    leftover -= step;
  }
  return parts;
}

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]!);
}

export function toLatinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/** Group digits the South Asian way: 12,34,567. */
function groupSouthAsian(whole: string): string {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

function groupInternational(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type Locale = "bn" | "en";

const SYMBOL: Record<Currency, Record<Locale, string>> = {
  BDT: { bn: "৳", en: "৳" },
  SAR: { bn: "﷼", en: "SAR " },
};

export interface FormatOptions {
  /** Hide ".00" when the amount has no fraction. */
  compactFraction?: boolean;
  symbol?: boolean;
}

/** BDT uses lakh/crore grouping; SAR uses thousands grouping. */
export function formatMoney(
  minor: number,
  currency: Currency,
  locale: Locale,
  { compactFraction = false, symbol = true }: FormatOptions = {},
): string {
  assertMinor(minor);
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = String(Math.trunc(abs / MINOR_PER_MAJOR));
  const fraction = String(abs % MINOR_PER_MAJOR).padStart(2, "0");
  const grouped = currency === "BDT" ? groupSouthAsian(whole) : groupInternational(whole);
  let text = compactFraction && fraction === "00" ? grouped : `${grouped}.${fraction}`;
  if (locale === "bn") text = toBanglaDigits(text);
  const prefix = symbol ? SYMBOL[currency][locale] : "";
  return `${negative ? "-" : ""}${prefix}${text}`;
}
