import { amountInWords, formatMoney, toBanglaDigits, type Currency, type Locale } from "@hajj/core";

export type { Locale };

export function money(minor: number, locale: Locale, currency: Currency = "BDT", compact = true) {
  return formatMoney(minor, currency, locale, { compactFraction: compact });
}

export function words(minor: number, locale: Locale, currency: Currency = "BDT") {
  return amountInWords(minor, currency, locale);
}

export function digits(value: string | number, locale: Locale) {
  return locale === "bn" ? toBanglaDigits(value) : String(value);
}

const TZ = "Asia/Dhaka";

export function dateText(value: Date | string, locale: Locale, withTime = false) {
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00+06:00` : value) : value;
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function timeText(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Friday, 2 October 2026 · 20 Rabi' al-Thani 1448 */
export function todayLine(locale: Locale, now = new Date()) {
  const greg = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  // Build the Hijri date from parts so the era label ("যুগ" / "AH") is ours, not the locale's.
  const parts = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD-u-ca-islamic-umalqura" : "en-GB-u-ca-islamic-umalqura", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const hijri = `${part("day")} ${part("month")} ${part("year")} ${locale === "bn" ? "হিজরি" : "AH"}`;
  return `${greg} · ${hijri}`;
}

/** +8801712345678 → 01712-345678 */
export function phoneText(e164: string, locale: Locale) {
  const local = e164.startsWith("+880") ? `0${e164.slice(4)}` : e164;
  const pretty = local.length === 11 ? `${local.slice(0, 5)}-${local.slice(5)}` : local;
  return digits(pretty, locale);
}

/** Two-letter avatar from a name: "Md. Abdul Karim" → "AK", "মো. আব্দুল করিম" → "আক". */
export function initials(name: string) {
  const parts = name
    .replace(/^(md|mohammad|muhammad|mst|মো|মোছা|মোসা)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}
