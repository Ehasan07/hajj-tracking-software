/**
 * Machine Readable Zone of a passport (ICAO 9303, TD3: two lines of 44
 * characters). Office MRZ scanners type these lines like a keyboard, and the
 * camera flow will feed recognised text through the same parser.
 */

export interface PassportMrz {
  documentType: string;
  issuingCountry: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  /** ISO date, century inferred (birth dates are never in the future). */
  dateOfBirth: string;
  sex: "M" | "F" | "X";
  /** ISO date, always 20xx. */
  expiryDate: string;
  personalNumber: string;
}

export type MrzResult = { ok: true; value: PassportMrz } | { ok: false; error: MrzError };

export type MrzError =
  | "FORMAT"
  | "CHECK_PASSPORT_NUMBER"
  | "CHECK_BIRTH_DATE"
  | "CHECK_EXPIRY_DATE"
  | "CHECK_PERSONAL_NUMBER"
  | "CHECK_COMPOSITE";

const WEIGHTS = [7, 3, 1];

function charValue(ch: string): number {
  if (ch === "<") return 0;
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return -1;
}

export function checkDigit(field: string): number {
  let total = 0;
  for (let i = 0; i < field.length; i++) total += charValue(field[i]!) * WEIGHTS[i % 3]!;
  return total % 10;
}

function verify(field: string, digit: string): boolean {
  // An all-filler optional field may carry "<" instead of 0.
  if (digit === "<") return /^<*$/.test(field);
  return checkDigit(field) === Number(digit);
}

function clean(value: string) {
  return value.replace(/<+$/g, "").replace(/</g, " ").trim();
}

function toIsoDate(yymmdd: string, kind: "birth" | "expiry", today: Date): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYy = today.getUTCFullYear() % 100;
  const century = kind === "expiry" ? 2000 : yy > currentYy ? 1900 : 2000;
  const year = century + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Accepts the two lines separated by any whitespace; tolerates lowercase and stray spaces from scanners. */
export function parsePassportMrz(input: string, today = new Date()): MrzResult {
  const lines = input
    .toUpperCase()
    .split(/[\r\n]+/)
    .map((l) => l.replace(/\s/g, ""))
    .filter(Boolean);
  let line1: string | undefined;
  let line2: string | undefined;
  if (lines.length === 2) [line1, line2] = lines;
  else if (lines.length === 1 && lines[0]!.length === 88) [line1, line2] = [lines[0]!.slice(0, 44), lines[0]!.slice(44)];
  if (!line1 || !line2 || line1.length !== 44 || line2.length !== 44) return { ok: false, error: "FORMAT" };
  if (!/^P[A-Z<]/.test(line1) || /[^A-Z0-9<]/.test(line1 + line2)) return { ok: false, error: "FORMAT" };

  const number = line2.slice(0, 9);
  const birth = line2.slice(13, 19);
  const expiry = line2.slice(21, 27);
  const personal = line2.slice(28, 42);

  if (!verify(number, line2[9]!)) return { ok: false, error: "CHECK_PASSPORT_NUMBER" };
  if (!verify(birth, line2[19]!)) return { ok: false, error: "CHECK_BIRTH_DATE" };
  if (!verify(expiry, line2[27]!)) return { ok: false, error: "CHECK_EXPIRY_DATE" };
  if (!verify(personal, line2[42]!)) return { ok: false, error: "CHECK_PERSONAL_NUMBER" };
  const composite = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  if (!verify(composite, line2[43]!)) return { ok: false, error: "CHECK_COMPOSITE" };

  const dateOfBirth = toIsoDate(birth, "birth", today);
  const expiryDate = toIsoDate(expiry, "expiry", today);
  if (!dateOfBirth || !expiryDate) return { ok: false, error: "FORMAT" };

  const [surnamePart = "", givenPart = ""] = line1.slice(5).split("<<");
  const sexChar = line2[20];
  return {
    ok: true,
    value: {
      documentType: clean(line1.slice(0, 2)),
      issuingCountry: clean(line1.slice(2, 5)),
      surname: clean(surnamePart),
      givenNames: clean(givenPart),
      passportNumber: clean(number),
      nationality: clean(line2.slice(10, 13)),
      dateOfBirth,
      sex: sexChar === "M" || sexChar === "F" ? sexChar : "X",
      expiryDate,
      personalNumber: clean(personal),
    },
  };
}

/** Saudi visas need at least six months of validity on the travel date. */
export function passportValidFor(expiryIso: string, travelIso: string, months = 6): boolean {
  const travel = new Date(`${travelIso}T00:00:00Z`);
  const limit = new Date(Date.UTC(travel.getUTCFullYear(), travel.getUTCMonth() + months, travel.getUTCDate()));
  return new Date(`${expiryIso}T00:00:00Z`) >= limit;
}

/** Uppercase, no spaces or dashes: the form used for encryption and the blind index. */
export function normalizePassportNumber(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "A01234567" → "A0•••••67" for lists and receipts. */
export function maskPassportNumber(value: string): string {
  if (value.length <= 4) return "•".repeat(value.length);
  return `${value.slice(0, 2)}${"•".repeat(value.length - 4)}${value.slice(-2)}`;
}
