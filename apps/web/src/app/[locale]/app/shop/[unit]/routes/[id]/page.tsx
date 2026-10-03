import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { addDays, routeNumber, weekdayOf, type ShopUnit } from "@hajj/core";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { Badge, buttonClass, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { keyLabel, weekdayName } from "@/lib/period";
import { routeLabel } from "@/lib/routes";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { DeliverForm } from "../route-forms";

/** The latest date on or before `today` that falls on `weekday`. */
function lastOn(weekday: number, today: string) {
  const back = (weekdayOf(today) - weekday + 7) % 7;
  return addDays(today, -back);
}

export default async function RouteDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit; id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale, unit, id } = await params;
  setRequestLocale(locale);
  if (unit !== "zamzam") notFound();
  const { date: requested } = await searchParams;
  const t = await getTranslations("shop");
  const caller = await api();
  const [routes, products, me, overview] = await Promise.all([
    caller.shop.routes({ unit }),
    caller.shop.products({ unit }),
    caller.tenant.me(),
    caller.shop.overview({ unit }),
  ]);
  const route = routes.find((r) => r.id === id);
  if (!route) notFound();
  const today = overview.day;
  const date =
    requested &&
    /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    requested <= today &&
    weekdayOf(requested) === route.weekday
      ? requested
      : lastOn(route.weekday, today);
  const day = await caller.shop.routeDay({ unit, routeId: id, date });
  const canWrite = date === today || BOOK_ROLES.includes(me.role);
  const sellable = products
    .filter((p) => !p.trackStock || p.stockQty > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
  const label = routeLabel(route, locale);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/shop/${unit}/routes`} className={buttonClass("outline")}>
          ← {t("tabs.routes")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/shop/${unit}/routes/${id}?date=${addDays(date, -7)}`}
            className={buttonClass("outline", "h-11")}
          >
            ‹ {dateText(addDays(date, -7), locale)}
          </Link>
          {addDays(date, 7) <= today ? (
            <Link
              href={`/app/shop/${unit}/routes/${id}?date=${addDays(date, 7)}`}
              className={buttonClass("outline", "h-11")}
            >
              {dateText(addDays(date, 7), locale)} ›
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>

      <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[60px_60px_22px_22px] bg-unit-zamzam px-7 pt-10 pb-6 text-white print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-display text-3xl">
              {t("routes.route", { n: digits(routeNumber(route.weekday), locale) })}
            </span>
            <span className="text-[15px] text-[#d6e6fb]">
              {[weekdayName(route.weekday, locale), route.name].filter(Boolean).join(" · ")}
            </span>
            <span className="text-[14px] text-[#d6e6fb]">{keyLabel(date, locale)}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right sm:grid-cols-4">
            {[
              [
                t("routes.visited", {
                  n: digits(day.totals.visited, locale),
                  total: digits(day.shops.length, locale),
                }),
                null,
              ],
              [t("routes.totalQty"), digits(day.totals.qty, locale)],
              [t("sales.total"), money(day.totals.total, locale)],
              [t("tiles.received"), money(day.totals.paid + day.totals.collected, locale)],
            ].map(([k, v]) => (
              <span key={String(k)} className="flex flex-col">
                <span className="text-[12px] text-[#d6e6fb]">{k}</span>
                {v ? <span className="tabular text-xl font-bold">{v}</span> : null}
              </span>
            ))}
          </div>
        </div>
      </section>

      {day.shops.length === 0 ? (
        <Card className="print:hidden">
          <EmptyState title={t("routes.noShops")} />
        </Card>
      ) : (
        <ol className="flex flex-col gap-3 print:hidden">
          {day.shops.map((s, i) => {
            const visited = s.sales.length > 0 || s.collected > 0;
            return (
              <li key={s.id}>
                <Card
                  className={`flex flex-col gap-3 border-l-4 p-5 ${visited ? "border-paid" : "border-line-strong"}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-unit-zamzam-tint font-bold text-unit-zamzam">
                      {digits(i + 1, locale)}
                    </span>
                    <Link
                      href={`/app/shop/${unit}/customers/${s.id}`}
                      className="flex min-w-0 flex-col"
                    >
                      <b className="text-[17px] hover:text-haram">{s.name}</b>
                      <span className="text-[13px] text-ink-3">
                        {[s.area, s.address, s.phone].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                    <span className="ml-auto flex flex-wrap items-center gap-2">
                      {visited ? (
                        <Badge tone="paid">
                          {t("routes.delivered")} · {digits(s.qty, locale)}
                        </Badge>
                      ) : (
                        <Badge>{t("routes.notVisited")}</Badge>
                      )}
                      <span
                        className={`tabular rounded-full px-3 py-1 text-sm font-bold ${s.balance > 0 ? "bg-due-tint text-due" : "bg-ground text-ink-3"}`}
                      >
                        {t("customers.balance")} {money(Math.max(s.balance, 0), locale)}
                      </span>
                    </span>
                  </div>
                  {s.sales.length ? (
                    <ul className="flex flex-wrap gap-2 text-[13px]">
                      {s.sales.map((sale) => (
                        <li key={sale.id}>
                          <Link
                            href={`/app/shop/${unit}/sales/${sale.id}`}
                            className="inline-flex items-center gap-2 rounded-full bg-ground px-3 py-1 hover:bg-haram-tint"
                          >
                            <span className="font-mono">{sale.ref}</span>
                            <span>× {digits(sale.qty, locale)}</span>
                            <b className="tabular">{money(sale.total, locale)}</b>
                            {sale.paid < sale.total ? (
                              <span className="text-due">
                                ({money(sale.total - sale.paid, locale)})
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                      {s.collected > 0 ? (
                        <li className="rounded-full bg-paid-tint px-3 py-1 font-semibold text-paid">
                          {t("customers.collected")} {money(s.collected, locale)}
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  {canWrite && sellable.length ? (
                    <DeliverForm
                      unit={unit}
                      routeId={route.id}
                      customerId={s.id}
                      balance={s.balance}
                      products={sellable.map((p) => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        stockQty: p.stockQty,
                        trackStock: p.trackStock,
                      }))}
                      date={date}
                      today={today}
                    />
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      {/* Paper sheet the delivery man carries: one line per shop, boxes to fill in by hand. */}
      <PrintDoc className="hidden print:block">
        <h1 className="text-xl font-bold">
          {label} — {keyLabel(date, locale)}
        </h1>
        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-left">
              {[
                "#",
                t("customers.shopName"),
                t("customers.area"),
                t("customers.phone"),
                t("customers.balance"),
                t("routes.qty"),
                t("routes.paidNow"),
              ].map((h) => (
                <th key={h} className="border border-ink px-2 py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {day.shops.map((s, i) => (
              <tr key={s.id}>
                <td className="border border-ink px-2 py-2">{digits(i + 1, locale)}</td>
                <td className="border border-ink px-2 py-2 font-semibold">{s.name}</td>
                <td className="border border-ink px-2 py-2">{s.area ?? ""}</td>
                <td className="border border-ink px-2 py-2">{s.phone ?? ""}</td>
                <td className="tabular border border-ink px-2 py-2 text-right">
                  {money(Math.max(s.balance, 0), locale)}
                </td>
                <td className="w-16 border border-ink px-2 py-2">
                  {s.qty ? digits(s.qty, locale) : ""}
                </td>
                <td className="w-24 border border-ink px-2 py-2" />
              </tr>
            ))}
          </tbody>
        </table>
      </PrintDoc>
    </>
  );
}
