import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@hajj/i18n";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  // A link opens in its own language (/guide is Bangla, /en/guide English),
  // not the phone's: shared links stay as sent, and pages kept for offline
  // use are never redirects.
  localeDetection: false,
});
