/**
 * Human-facing reference numbers. The sequence itself comes from a
 * per-tenant counter row in the database (locked with SELECT ... FOR UPDATE),
 * these helpers only format and validate.
 */

export const ID_KINDS = {
  pilgrim: "HJ",
  receipt: "MR",
  inquiry: "IQ",
  salarySheet: "SS",
  sale: "SL",
  booking: "HB",
} as const;

export type IdKind = keyof typeof ID_KINDS;

const SEQUENCE_WIDTH = 6;

export interface FormatIdInput {
  /** Agency prefix chosen during onboarding, e.g. "HJ" or "ABC". */
  prefix: string;
  /** Calendar year the sequence belongs to. */
  year: number;
  sequence: number;
}

/** HJ-26-000123 */
export function formatReference({ prefix, year, sequence }: FormatIdInput): string {
  if (!/^[A-Z]{2,5}$/.test(prefix)) throw new RangeError(`Invalid prefix "${prefix}"`);
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError("Sequence must start at 1");
  const yy = String(year % 100).padStart(2, "0");
  const seq = String(sequence).padStart(SEQUENCE_WIDTH, "0");
  return `${prefix}-${yy}-${seq}`;
}

const REFERENCE_PATTERN = /^([A-Z]{2,5})-(\d{2})-(\d{6,})$/;

export function parseReference(value: string): { prefix: string; yy: number; sequence: number } | null {
  const match = REFERENCE_PATTERN.exec(value.trim().toUpperCase());
  if (!match) return null;
  return { prefix: match[1]!, yy: Number(match[2]), sequence: Number(match[3]) };
}

/** Normalise a Bangladeshi mobile number to E.164 (+8801XXXXXXXXX). */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^1[3-9]\d{8}$/.test(local) ? `+880${local}` : null;
}
