/**
 * SMS text rules. A message in plain English letters (GSM-7) fits 160
 * characters in one SMS, or 153 per part when longer. Anything with Bangla
 * (or other Unicode) fits 70, or 67 per part. Providers bill per part, and
 * the plan's monthly SMS allowance counts parts too.
 */

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export interface SmsSize {
  unicode: boolean;
  /** Characters as the network counts them (extension characters count twice). */
  length: number;
  parts: number;
  /** Room left in the last part. */
  remaining: number;
}

export function smsSize(text: string): SmsSize {
  const chars = [...text];
  const unicode = chars.some((c) => !GSM7.includes(c) && !GSM7_EXT.includes(c));
  const length = unicode ? chars.length : chars.reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  const parts = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  const capacity = parts <= 1 ? single : parts * multi;
  return { unicode, length, parts, remaining: capacity - length };
}

/** Longest notice the software will send: 6 Bangla parts. */
export const SMS_MAX_LENGTH = 402;

const BN = "০১২৩৪৫৬৭৮৯";
const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN[Number(d)]!);

/** ৳1,23,456 in Bangla digits, whole taka, from paisa. */
function taka(minor: number) {
  const whole = Math.round(minor / 100);
  const s = String(whole);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `৳${bnDigits(rest ? `${rest},${last3}` : last3)}`;
}

/**
 * The text a pilgrim receives when money is taken. Kept short (two Bangla
 * parts) and free of anything a stranger could misuse: no passport number,
 * no full name.
 */
export function receiptSms(input: { agency: string; amount: number; receiptNo: string; due: number; verifyUrl: string }): string {
  // A long name is cut at a word, so it never ends half-way through one.
  const cut = input.agency.slice(0, 28);
  const agency = input.agency.length > 28 ? `${cut.slice(0, cut.lastIndexOf(" ") > 10 ? cut.lastIndexOf(" ") : 27).trimEnd()}…` : input.agency;
  const due = input.due > 0 ? ` বাকি ${taka(input.due)}।` : " সব টাকা পরিশোধ হয়েছে।";
  return `${agency}: ${taka(input.amount)} জমা হয়েছে, রসিদ ${input.receiptNo}।${due} যাচাই: ${input.verifyUrl}`;
}

/** The text of a one-time code. */
export function codeSms(code: string, purpose: "verify" | "reset"): string {
  const what = purpose === "verify" ? "মোবাইল যাচাইয়ের" : "পাসওয়ার্ড রিসেটের";
  return `Hajj Tracking: আপনার ${what} কোড ${code}। ১০ মিনিট কাজ করবে। কাউকে বলবেন না।`;
}
