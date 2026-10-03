import { addDays } from "@hajj/core";
import { digits, type Locale } from "./format";

export type Period = "day" | "month" | "year";

export function periodOf(key: string): Period {
  return key.length === 10 ? "day" : key.length === 7 ? "month" : "year";
}

/** The neighbouring day, month or year of a period key. */
export function shiftKey(key: string, delta: number): string {
  const period = periodOf(key);
  if (period === "day") return addDays(key, delta);
  if (period === "year") return String(Number(key) + delta);
  const [y, m] = key.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Convert today's key to the same period kind. */
export function keyFor(period: Period, today: string): string {
  return period === "day" ? today : period === "month" ? today.slice(0, 7) : today.slice(0, 4);
}

export function keyLabel(key: string, locale: Locale): string {
  const period = periodOf(key);
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  if (period === "year") return digits(key, locale);
  if (period === "month") {
    return new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${key}-01T12:00:00Z`),
    );
  }
  return new Intl.DateTimeFormat(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T12:00:00Z`));
}

export function shortDay(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${key}T12:00:00Z`));
}

export function weekdayName(weekday: number, locale: Locale): string {
  // 2026-10-04 is a Sunday.
  const d = new Date(Date.UTC(2026, 9, 4 + weekday, 12));
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(d);
}

/** A query string from defined values only. */
export function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
