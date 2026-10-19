/**
 * Password rules and a strength score, shared by the forms (live checklist
 * and meter) and the server (which refuses anything that fails a rule).
 *
 * Required: at least 10 characters, upper and lower case letters, a number,
 * not a well-known password, and not built from the person's own name or
 * email. A symbol is optional; it and extra length raise the score.
 */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export type PasswordRule = "length" | "upper" | "lower" | "number" | "symbol" | "notCommon" | "notPersonal";

/** Rules a password must pass. `symbol` is shown in the checklist but only adds strength. */
export const REQUIRED_RULES: readonly PasswordRule[] = ["length", "upper", "lower", "number", "notCommon", "notPersonal"];

/** 0 very weak · 1 weak · 2 fair · 3 strong · 4 very strong */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordCheck {
  rules: Record<PasswordRule, boolean>;
  /** Every required rule passes. */
  ok: boolean;
  score: PasswordScore;
}

export interface PasswordContext {
  name?: string | null;
  email?: string | null;
}

/*
 * Passwords that are tried first by anyone guessing: the global lists, plus
 * the words an agency in Bangladesh is likely to reach for. Compared after
 * lower-casing, undoing common letter swaps (@→a, 0→o, $→s …) and dropping
 * the digits and symbols people pad them with.
 */
const COMMON = new Set([
  "password", "passw", "passwd", "pass", "admin", "administrator", "welcome", "letmein", "login", "qwerty",
  "qwertyuiop", "asdfgh", "asdfghjkl", "zxcvbnm", "abc", "abcd", "abcdef", "iloveyou", "monkey", "dragon",
  "master", "sunshine", "princess", "football", "cricket", "baseball", "shadow", "superman", "batman",
  "trustno", "secret", "changeme", "default", "test", "tester", "guest", "user", "root", "hello",
  "freedom", "whatever", "computer", "internet", "samsung", "google", "facebook", "whatsapp", "android",
  "iphone", "bangladesh", "bangla", "dhaka", "chittagong", "chattogram", "sylhet", "rajshahi", "khulna",
  "barisal", "comilla", "allah", "allahu", "akbar", "bismillah", "alhamdulillah", "subhanallah",
  "mashallah", "inshallah", "muhammad", "mohammad", "mohammed", "islam", "muslim", "quran", "makkah",
  "mecca", "makka", "madina", "medina", "madinah", "kaaba", "kabah", "zamzam", "hajj", "haji", "hajji",
  "umrah", "umra", "travel", "travels", "tours", "agency", "baitullah", "labbaik", "office", "company",
  "shop", "pharmacy", "medicine", "coffee", "supernova", "naba", "money", "taka", "love", "lovely",
  "family", "mother", "father", "amma", "abba", "baby", "angel", "friend", "friends", "summer", "winter",
]);

const LEET: Record<string, string> = { "@": "a", "4": "a", "0": "o", "1": "i", "!": "i", "3": "e", "$": "s", "5": "s", "7": "t" };

/**
 * The letters a guesser would start from, read three ways: as typed, with
 * the padding at either end dropped before undoing swaps ("P@ssw0rd123"),
 * and with every swap undone ("H@jj").
 */
function cores(password: string): string[] {
  const lower = password.toLowerCase();
  const swap = (s: string) => s.replace(/[@4013!$57]/g, (c) => LEET[c]!);
  const letters = (s: string) => s.replace(/[^a-z]/g, "");
  const trimmed = lower.replace(/^[^a-z@$]+/, "").replace(/[^a-z]+$/, "");
  return [...new Set([letters(lower), letters(swap(trimmed)), letters(swap(lower))])];
}

const ROWS = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ROWS_BOTH = [...ROWS, ...ROWS.map((r) => [...r].reverse().join(""))];

/** Whether `lower` holds `size` keys in a row from the alphabet, the digits or a keyboard row. */
function hasRun(lower: string, size: number): boolean {
  for (let i = 0; i + size <= lower.length; i++) {
    const piece = lower.slice(i, i + size);
    if (ROWS_BOTH.some((r) => r.includes(piece))) return true;
  }
  return false;
}

/** How many three-key runs like "abc", "321", "qwe" the password has. */
function runCount(lower: string): number {
  let total = 0;
  for (let i = 0; i + 3 <= lower.length; i++) if (hasRun(lower.slice(i, i + 3), 3)) total++;
  return total;
}

function isCommon(password: string): boolean {
  const lower = password.toLowerCase();
  // Only digits or one repeated character: "1234567890", "aaaaaaaaaa".
  if (/^\d+$/.test(lower) || /^(.)\1+$/.test(lower)) return true;
  if (/^(0123456789|1234567890|9876543210|0987654321)/.test(lower)) return true;
  // Four of the same in a row, a run of five ("abcde", "12345", "qwert"), or hardly any different characters.
  if (/(.)\1{3}/.test(lower) || hasRun(lower, 5) || new Set(lower).size < 5) return true;
  return cores(password).some((letters) => {
    if (!letters || COMMON.has(letters)) return true;
    // Two common words run together, e.g. "Allah-Hajj-2026".
    for (const word of COMMON) {
      if (word.length >= 4 && letters.startsWith(word) && COMMON.has(letters.slice(word.length))) return true;
    }
    return false;
  });
}

/** Pieces of the person's name and email that should not be the password's backbone. */
function personalParts({ name, email }: PasswordContext): string[] {
  const parts: string[] = [];
  const local = (email ?? "").split("@")[0]!.toLowerCase();
  parts.push(local, ...local.split(/[^a-z0-9]+/));
  for (const word of (name ?? "").toLowerCase().split(/\s+/)) parts.push(word.replace(/[^a-z0-9]/g, ""));
  return [...new Set(parts.filter((p) => p.length >= 4))];
}

function isPersonal(password: string, context: PasswordContext): boolean {
  const lower = password.toLowerCase();
  const letters = cores(password);
  return personalParts(context).some((part) => lower.includes(part) || (/^[a-z]+$/.test(part) && letters.some((l) => l.includes(part))));
}


export function checkPassword(password: string, context: PasswordContext = {}): PasswordCheck {
  const length = [...password].length;
  const rules: Record<PasswordRule, boolean> = {
    length: length >= PASSWORD_MIN && length <= PASSWORD_MAX,
    upper: /\p{Lu}/u.test(password),
    lower: /\p{Ll}/u.test(password),
    number: /[0-9০-৯]/.test(password),
    symbol: /[^\p{L}\p{N}]/u.test(password),
    notCommon: password.length > 0 && !isCommon(password),
    notPersonal: password.length > 0 && !isPersonal(password, context),
  };
  const ok = REQUIRED_RULES.every((r) => rules[r]);

  // Score: length first, then variety, minus the patterns guessers try.
  const classes = [rules.upper, rules.lower, rules.number, rules.symbol, /[ঀ-৿]/.test(password)].filter(Boolean).length;
  let points = -1;
  if (length >= PASSWORD_MIN) points++;
  if (length >= 12) points++;
  if (length >= 14) points++;
  if (length >= 18) points++;
  if (classes >= 3) points++;
  if (classes >= 4) points++;
  if (/(.)\1\1/.test(password)) points--;
  if (runCount(password.toLowerCase()) >= 2) points--;
  if (new Set(password).size < length / 2) points--;

  let score = Math.max(0, Math.min(4, points)) as PasswordScore;
  if (!rules.notCommon || !rules.notPersonal || length < 6) score = 0;
  else if (!ok) score = Math.min(score, 1) as PasswordScore;
  else score = Math.max(score, 2) as PasswordScore;
  return { rules, ok, score };
}

/**
 * A strong password to hand to a colleague: 16 characters from a set without
 * look-alikes (no 0/O, 1/l/I), always with upper, lower, number and symbol.
 * `random` returns a uniform integer in [0, max); pass crypto-backed randomness.
 */
export function generatePassword(random: (max: number) => number): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "-_.!@#%+=";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[random(set.length)]!;
  for (;;) {
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < 16) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    const candidate = chars.join("");
    if (checkPassword(candidate).score >= 3) return candidate;
  }
}
