import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { addDays, routeNumber, type ShopUnit } from "@hajj/core";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { Button, buttonClass, Card, EmptyState, Field, SelectField } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { routeLabel, routeShort } from "@/lib/routes";
import { api } from "@/trpc/server";

const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

export default async function DeliveriesReport({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
  searchParams: Promise<{ from?: string; to?: string; route?: string }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  if (unit !== "zamzam") notFound();
  const sp = await searchParams;
  const t = await getTranslations("shop");
  const caller = await api();
  const [overview, routes] = await Promise.all([
    caller.shop.overview({ unit }),
    caller.shop.routes({ unit }),
  ]);
  const to = isDate(sp.to) ? sp.to! : overview.day;
  const from = isDate(sp.from) && sp.from! <= to ? sp.from! : addDays(to, -6);
  const routeId = routes.some((r) => r.id === sp.route) ? sp.route : undefined;
  const report = await caller.shop.deliveries({ unit, from, to, routeId });
  const ordered = [...routes].sort((a, b) => routeNumber(a.weekday) - routeNumber(b.weekday));
  const totals = report.rows.reduce(
    (a, r) => ({
      qty: a.qty + r.qty,
      total: a.total + r.total,
      deliveries: a.deliveries + r.deliveries,
    }),
    { qty: 0, total: 0, deliveries: 0 },
  );

  const table = (
    <table className="w-full min-w-[640px] text-[15px] print:min-w-0 print:text-[12px]">
      <thead className="bg-field text-left text-[13px] text-ink-3">
        <tr>
          <th className="px-5 py-3 font-normal">{t("customers.shopName")}</th>
          <th className="px-3 py-3 font-normal">{t("customers.route")}</th>
          <th className="px-3 py-3 text-right font-normal">{t("routes.deliveries")}</th>
          <th className="px-3 py-3 text-right font-normal">{t("routes.totalQty")}</th>
          <th className="px-5 py-3 text-right font-normal">{t("sales.total")}</th>
        </tr>
      </thead>
      <tbody>
        {report.rows.map((r) => (
          <tr key={r.customerId} className="border-t border-[#eef3f2]">
            <td className="px-5 py-3">
              <Link href={`/app/shop/${unit}/customers/${r.customerId}`} className="flex flex-col">
                <b className="font-semibold">{r.name}</b>
                {r.area ? <span className="text-[12px] text-ink-3">{r.area}</span> : null}
              </Link>
            </td>
            <td className="px-3 py-3 text-[13px] text-ink-2">
              {r.routeWeekday !== null ? routeShort({ weekday: r.routeWeekday }, locale) : "—"}
            </td>
            <td className="tabular px-3 py-3 text-right">{digits(r.deliveries, locale)}</td>
            <td className="tabular px-3 py-3 text-right font-bold">{digits(r.qty, locale)}</td>
            <td className="tabular px-5 py-3 text-right font-semibold">{money(r.total, locale)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-ink font-bold">
          <td className="px-5 py-3" colSpan={2}>
            {t("sales.total")}
          </td>
          <td className="tabular px-3 py-3 text-right">{digits(totals.deliveries, locale)}</td>
          <td className="tabular px-3 py-3 text-right">{digits(totals.qty, locale)}</td>
          <td className="tabular px-5 py-3 text-right">{money(totals.total, locale)}</td>
        </tr>
      </tfoot>
    </table>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/shop/${unit}/routes`} className={buttonClass("outline")}>
          ← {t("tabs.routes")}
        </Link>
        <PrintButton />
      </div>
      <div className="flex flex-col gap-1 print:hidden">
        <h2 className="text-xl font-bold">{t("routes.report")}</h2>
        <p className="text-[15px] text-ink-3">{t("routes.reportHint")}</p>
      </div>

      <form method="get" className="grid gap-4 rounded-lg bg-paper p-5 sm:grid-cols-4 print:hidden">
        <Field
          id="rp-from"
          name="from"
          type="date"
          max={overview.day}
          defaultValue={from}
          label={t("routes.from")}
        />
        <Field
          id="rp-to"
          name="to"
          type="date"
          max={overview.day}
          defaultValue={to}
          label={t("routes.to")}
        />
        <SelectField
          id="rp-route"
          name="route"
          defaultValue={routeId ?? ""}
          label={t("customers.route")}
        >
          <option value="">{t("routes.allRoutes")}</option>
          {ordered.map((r) => (
            <option key={r.id} value={r.id}>
              {routeLabel(r, locale)}
            </option>
          ))}
        </SelectField>
        <Button type="submit" className="self-end">
          {t("routes.show")}
        </Button>
      </form>

      {report.products.length ? (
        <div className="flex flex-wrap gap-3 print:hidden">
          {report.products.map((p) => (
            <Card key={p.name} className="flex flex-col gap-0.5 px-5 py-3">
              <span className="text-[13px] text-ink-3">{p.name}</span>
              <span className="tabular text-xl font-bold">{digits(p.qty, locale)}</span>
              <span className="tabular text-[13px] text-ink-2">{money(p.total, locale)}</span>
            </Card>
          ))}
        </div>
      ) : null}

      {report.rows.length === 0 ? (
        <Card className="print:hidden">
          <EmptyState title={t("sales.none")} />
        </Card>
      ) : (
        <Card className="overflow-hidden print:hidden">
          <div className="overflow-x-auto">{table}</div>
        </Card>
      )}

      <PrintDoc className="hidden print:block">
        <h1 className="text-lg font-bold">
          {t("routes.report")} · {dateText(from, locale)} – {dateText(to, locale)}
        </h1>
        {table}
      </PrintDoc>
    </>
  );
}
