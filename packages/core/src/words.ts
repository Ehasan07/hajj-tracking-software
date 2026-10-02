import { assertMinor, MINOR_PER_MAJOR, type Currency, type Locale } from "./money";

/** Bangla has an irregular word for every number below one hundred. */
export const BN_0_99 = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়",
  "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ",
  "বিশ", "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আটাশ", "উনত্রিশ",
  "ত্রিশ", "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "উনচল্লিশ",
  "চল্লিশ", "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "উনপঞ্চাশ",
  "পঞ্চাশ", "একান্ন", "বাহান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "উনষাট",
  "ষাট", "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "উনসত্তর",
  "সত্তর", "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "উনআশি",
  "আশি", "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "উননব্বই",
  "নব্বই", "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই",
] as const;

const EN_ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function en0to99(n: number): string {
  if (n < 20) return EN_ONES[n]!;
  const tens = EN_TENS[Math.trunc(n / 10)]!;
  return n % 10 ? `${tens}-${EN_ONES[n % 10]}` : tens;
}

function bn0to99(n: number): string {
  return BN_0_99[n]!;
}

interface Scale {
  value: number;
  bn: string;
  en: string;
}

/** South Asian scale: crore (10^7), lakh (10^5), thousand, hundred. */
const SCALES: Scale[] = [
  { value: 10_000_000, bn: "কোটি", en: "Crore" },
  { value: 100_000, bn: "লক্ষ", en: "Lakh" },
  { value: 1_000, bn: "হাজার", en: "Thousand" },
  { value: 100, bn: "শত", en: "Hundred" },
];

/** Spell a non-negative integer using crore/lakh grouping. */
export function integerToWords(n: number, locale: Locale): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Cannot spell ${n}`);
  const small = locale === "bn" ? bn0to99 : en0to99;
  if (n < 100) return small(n);

  const parts: string[] = [];
  let rest = n;
  for (const scale of SCALES) {
    if (rest < scale.value) continue;
    const count = Math.trunc(rest / scale.value);
    rest %= scale.value;
    // Above 99 crore the count itself needs spelling with lakh/thousand again.
    const countWords = count < 100 ? small(count) : integerToWords(count, locale);
    parts.push(`${countWords} ${locale === "bn" ? scale.bn : scale.en}`);
  }
  if (rest > 0) parts.push(small(rest));
  return parts.join(" ");
}

const UNIT_NAMES: Record<Currency, Record<Locale, { major: string; minor: string }>> = {
  BDT: { bn: { major: "টাকা", minor: "পয়সা" }, en: { major: "Taka", minor: "Paisa" } },
  SAR: { bn: { major: "রিয়াল", minor: "হালালা" }, en: { major: "Riyal", minor: "Halala" } },
};

/** "এক লক্ষ পঁচিশ হাজার টাকা মাত্র" / "One Lakh Twenty-Five Thousand Taka Only" */
export function amountInWords(minor: number, currency: Currency, locale: Locale): string {
  assertMinor(minor);
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = Math.trunc(abs / MINOR_PER_MAJOR);
  const fraction = abs % MINOR_PER_MAJOR;
  const names = UNIT_NAMES[currency][locale];

  const words: string[] = [];
  if (negative) words.push(locale === "bn" ? "ঋণাত্মক" : "Minus");
  if (major > 0 || fraction === 0) words.push(integerToWords(major, locale), names.major);
  if (fraction > 0) {
    if (major > 0) words.push(locale === "bn" ? "এবং" : "and");
    words.push(integerToWords(fraction, locale), names.minor);
  }
  words.push(locale === "bn" ? "মাত্র" : "Only");
  return words.join(" ");
}
