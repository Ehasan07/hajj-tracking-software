import { routeNumber } from "@hajj/core";
import { digits, type Locale } from "./format";
import { weekdayName } from "./period";

/** "রোড ১ · শনিবার · মতিঝিল" — number and weekday always, the agency's own name when given. */
export function routeLabel(route: { weekday: number; name: string | null }, locale: Locale) {
  const n = digits(routeNumber(route.weekday), locale);
  const head = `${locale === "bn" ? "রোড" : "Route"} ${n} · ${weekdayName(route.weekday, locale)}`;
  return route.name ? `${head} · ${route.name}` : head;
}

/** "রোড ১ · শনিবার", without the agency's name. */
export function routeShort(route: { weekday: number }, locale: Locale) {
  return routeLabel({ weekday: route.weekday, name: null }, locale);
}
