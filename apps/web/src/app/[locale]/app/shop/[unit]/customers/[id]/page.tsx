import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ShopUnit } from "@hajj/core";
import { Reveal } from "@/components/reveal";
import { Badge, buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { routeLabel } from "@/lib/routes";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { CollectForm, CustomerForm } from "../customer-forms";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit; id: string }>;
}) {
  const { locale, unit, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const tm = await getTranslations("methods");
  const caller = await api();
  const [data, routes, overview, me] = await Promise.all([
    caller.shop.customer({ unit, id }),
    unit === "zamzam" ? caller.shop.routes({ unit }) : Promise.resolve([]),
    caller.shop.overview({ unit }),
    caller.tenant.me(),
  ]);
  const { customer, balance } = data;
  const routeOptions = [...routes]
    .sort((a, b) => ((a.weekday + 1) % 7) - ((b.weekday + 1) % 7))
    .map((r) => ({ id: r.id, label: routeLabel(r, locale) }));

  // One timeline of sales and payments, newest first.
  const timeline = [
    ...data.history.map((s) => ({ kind: "sale" as const, at: s.businessDate, key: s.id, sale: s })),
    ...data.payments.map((p) => ({
      kind: "payment" as const,
      at: p.businessDate,
      key: p.id,
      payment: p,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <Link href={`/app/shop/${unit}/customers`} className={buttonClass("outline", "self-start")}>
        ← {unit === "zamzam" ? t("tabs.shops") : t("tabs.customers")}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex animate-rise flex-col gap-2 p-6">
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-ink-3">
            {[customer.area, customer.address, customer.phone].filter(Boolean).join(" · ") || "—"}
          </p>
          {data.routeWeekday !== null ? (
            <p className="text-[15px] font-semibold text-unit-zamzam">
              {routeLabel({ weekday: data.routeWeekday, name: data.routeName }, locale)}
            </p>
          ) : null}
          {customer.openingDue > 0 ? (
            <p className="text-[13px] text-ink-3">
              {t("customers.openingDue")}: {money(customer.openingDue, locale)}
            </p>
          ) : null}
        </Card>
        <Card className="flex animate-rise flex-col items-center justify-center gap-1 p-6 [animation-delay:60ms]">
          <span className="text-[13px] font-semibold text-ink-3">{t("customers.balance")}</span>
          <span className={`tabular text-4xl font-bold ${balance > 0 ? "text-due" : "text-paid"}`}>
            {money(Math.max(balance, 0), locale)}
          </span>
        </Card>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <h2 className="px-6 pt-5 pb-3 text-lg font-bold">
            {t("customers.history")} · {t("customers.payments")}
          </h2>
          {timeline.length === 0 ? (
            <p className="px-6 pb-6 text-ink-3">{t("sales.none")}</p>
          ) : (
            <ul>
              {timeline.map((row) =>
                row.kind === "sale" ? (
                  <li
                    key={row.key}
                    className={`flex flex-wrap items-center gap-3 border-t border-[#eef3f2] px-6 py-3 text-[15px] ${row.sale.status === "void" ? "text-ink-3 line-through" : ""}`}
                  >
                    <span className="w-28 text-[13px] text-ink-3">{dateText(row.at, locale)}</span>
                    <Link
                      href={`/app/shop/${unit}/sales/${row.sale.id}`}
                      className="font-mono text-[13px] text-haram hover:underline"
                    >
                      {row.sale.ref}
                    </Link>
                    <span className="tabular text-ink-2">× {digits(row.sale.qty, locale)}</span>
                    <span className="tabular ml-auto font-semibold">
                      {money(row.sale.total, locale)}
                    </span>
                    {row.sale.total > row.sale.paid && row.sale.status !== "void" ? (
                      <Badge tone="due">
                        {t("sales.due")} {money(row.sale.total - row.sale.paid, locale)}
                      </Badge>
                    ) : null}
                  </li>
                ) : (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-center gap-3 border-t border-[#eef3f2] bg-paid-tint/40 px-6 py-3 text-[15px]"
                  >
                    <span className="w-28 text-[13px] text-ink-3">{dateText(row.at, locale)}</span>
                    <span className="font-semibold text-paid">{t("customers.collected")}</span>
                    <span className="text-[13px] text-ink-2">{tm(row.payment.method)}</span>
                    <span className="tabular ml-auto font-bold text-paid">
                      − {money(row.payment.amount, locale)}
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("customers.collect")}</h2>
            <CollectForm
              unit={unit}
              customerId={customer.id}
              balance={Math.max(balance, 0)}
              today={overview.day}
              canBackdate={BOOK_ROLES.includes(me.role)}
            />
          </Card>
          <Reveal label={t("customers.edit")} variant="outline" plus={false}>
            <CustomerForm unit={unit} routes={routeOptions} initial={customer} />
          </Reveal>
        </div>
      </div>
    </>
  );
}
