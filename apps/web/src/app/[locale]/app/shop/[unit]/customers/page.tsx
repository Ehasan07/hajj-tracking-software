import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ShopUnit } from "@hajj/core";
import { SearchIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { money, type Locale } from "@/lib/format";
import { routeLabel, routeShort } from "@/lib/routes";
import { api } from "@/trpc/server";
import { CustomerForm } from "./customer-forms";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
  searchParams: Promise<{ q?: string; route?: string }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  const { q, route } = await searchParams;
  const t = await getTranslations("shop");
  const caller = await api();
  const [customers, routes] = await Promise.all([
    caller.shop.customers({ unit, q, routeId: route }),
    unit === "zamzam" ? caller.shop.routes({ unit }) : Promise.resolve([]),
  ]);
  const ordered = [...routes].sort((a, b) => ((a.weekday + 1) % 7) - ((b.weekday + 1) % 7));
  const routeOptions = ordered.map((r) => ({ id: r.id, label: routeLabel(r, locale) }));
  const routeName = new Map(ordered.map((r) => [r.id, routeShort(r, locale)]));
  const totalDue = customers.reduce((a, c) => a + Math.max(c.balance, 0), 0);

  return (
    <>
      <Reveal label={unit === "zamzam" ? t("customers.addShop") : t("customers.add")}>
        <CustomerForm unit={unit} routes={routeOptions} />
      </Reveal>

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" role="search" className="min-w-64 flex-1">
          {route ? <input type="hidden" name="route" value={route} /> : null}
          <label className="flex h-12 items-center gap-3 rounded-lg border-[1.5px] border-line-strong bg-paper px-4 focus-within:border-haram">
            <SearchIcon size={20} className="text-haram" />
            <input
              name="q"
              defaultValue={q}
              placeholder={t("customers.search")}
              aria-label={t("customers.search")}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
        </form>
        <span className="rounded-md bg-paper px-4 py-3 text-[15px]">
          {t("customers.total")}: <b className="tabular text-due">{money(totalDue, locale)}</b>
        </span>
      </div>

      {routeOptions.length ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/shop/${unit}/customers`}
            className={`h-9 rounded-full px-4 py-1.5 text-sm font-semibold ${!route ? "bg-ink text-white" : "bg-paper text-ink-2"}`}
          >
            {t("routes.allRoutes")}
          </Link>
          {ordered.map((r) => (
            <Link
              key={r.id}
              href={`/app/shop/${unit}/customers?route=${r.id}`}
              className={`h-9 rounded-full px-4 py-1.5 text-sm font-semibold ${route === r.id ? "bg-ink text-white" : "bg-paper text-ink-2"}`}
            >
              {routeShort(r, locale)}
            </Link>
          ))}
        </div>
      ) : null}

      {customers.length === 0 ? (
        <Card>
          <EmptyState title={t("customers.none")} />
        </Card>
      ) : (
        <Card className="animate-rise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-normal">
                    {unit === "zamzam" ? t("customers.shopName") : t("customers.name")}
                  </th>
                  <th className="px-3 py-3 font-normal">{t("customers.area")}</th>
                  {routeOptions.length ? (
                    <th className="px-3 py-3 font-normal">{t("customers.route")}</th>
                  ) : null}
                  <th className="px-5 py-3 text-right font-normal">{t("customers.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-[#eef3f2] hover:bg-field ${c.active ? "" : "text-ink-3"}`}
                  >
                    <td className="px-5 py-3">
                      <Link href={`/app/shop/${unit}/customers/${c.id}`} className="flex flex-col">
                        <b className="font-semibold hover:text-haram">{c.name}</b>
                        {c.phone ? <span className="text-[12px] text-ink-3">{c.phone}</span> : null}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{c.area ?? "—"}</td>
                    {routeOptions.length ? (
                      <td className="px-3 py-3 text-[13px] text-ink-2">
                        {c.routeId ? routeName.get(c.routeId) : "—"}
                      </td>
                    ) : null}
                    <td className="tabular px-5 py-3 text-right font-semibold">
                      {!c.active ? (
                        <Badge>{t("customers.inactive")}</Badge>
                      ) : c.balance > 0 ? (
                        <span className="text-due">{money(c.balance, locale)}</span>
                      ) : (
                        <span className="text-ink-3">{t("customers.noDue")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
