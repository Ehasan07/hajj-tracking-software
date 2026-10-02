import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@hajj/i18n";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
});
