import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routeNumber, weekdayOf, type ShopUnit } from "@hajj/core";
import { TruckIcon } from "@/components/icons";
import { buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import { weekdayName } from "@/lib/period";
import { api } from "@/trpc/server";
import { RouteNameForm } from "./route-forms";

export default async function RoutesPage({
  params,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  if (unit !== "zamzam") notFound();
  const t = await getTranslations("shop.routes");
  const caller = await api();
  const [routes, overview] = await Promise.all([
    caller.shop.routes({ unit }),
    caller.shop.overview({ unit }),
  ]);
  const todayWeekday = weekdayOf(overview.day);
  const ordered = [...routes].sort((a, b) => routeNumber(a.weekday) - routeNumber(b.weekday));
  const todays = ordered.find((r) => r.weekday === todayWeekday)!;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="max-w-2xl text-[15px] text-ink-3">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/app/shop/${unit}/routes/report`} className={buttonClass("outline")}>
            {t("report")}
          </Link>
          <Link href={`/app/shop/${unit}/routes/${todays.id}`} className={buttonClass("primary")}>
            <TruckIcon size={20} tint="var(--color-haram-tint)" accent="var(--color-saffron)" />
            {t("today")}
          </Link>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ordered.map((r, i) => {
          const isToday = r.weekday === todayWeekday;
          return (
            <li key={r.id}>
              <Card
                className={`flex h-full animate-rise flex-col gap-2 rounded-[60px_60px_18px_18px] border-t-4 px-6 pt-7 pb-5 ${isToday ? "border-unit-zamzam shadow-[0_0_0_3px_var(--color-unit-zamzam-tint)]" : "border-line-strong"}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-2xl text-unit-zamzam">
                    {t("route", { n: digits(routeNumber(r.weekday), locale) })}
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-unit-zamzam px-2.5 py-0.5 text-[12px] font-bold text-white">
                      {t("today")}
                    </span>
                  ) : null}
                </span>
                <span className="text-[15px] font-semibold">{weekdayName(r.weekday, locale)}</span>
                <span className={`text-[14px] ${r.name ? "text-ink" : "text-ink-3 italic"}`}>
                  {r.name || t("unnamed")}
                </span>
                <span className="text-[13px] text-ink-3">
                  {t("shops", { n: digits(r.shops, locale) })}
                </span>
                <RouteNameForm unit={unit} id={r.id} name={r.name} />
                <Link
                  href={`/app/shop/${unit}/routes/${r.id}`}
                  className={buttonClass(isToday ? "primary" : "outline", "mt-auto h-11")}
                >
                  {t("open")}
                </Link>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
