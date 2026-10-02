import bn from "../messages/bn.json";
import en from "../messages/en.json";

export const LOCALES = ["bn", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "bn";

export type Messages = typeof bn;

export const messages: Record<AppLocale, Messages> = { bn, en };

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
