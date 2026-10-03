import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ShopUnit } from "@hajj/core";
import { PeriodNav } from "@/components/period-nav";
import { Badge, Card, EmptyState } from "@/components/ui";
import { VoidButton } from "@/components/void-button";
import { Link } from "@/i18n/navigation";
import { money, timeText, type Locale } from "@/lib/format";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";

export default async function SalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  const { date: requested } = await searchParams;
  const t = await getTranslations("shop");
  const tm = await getTranslations("methods");
  const caller = await api();
  const [overview, me] = await Promise.all([caller.shop.overview({ unit }), caller.tenant.me()]);
  const date =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= overview.day
      ? requested
      : overview.day;
  const sales = await caller.shop.sales({ unit, date });
  const canVoid = BOOK_ROLES.includes(me.role);
  const live = sales.filter((s) => s.status === "completed");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav
          base={`/app/shop/${unit}/sales`}
          keyName="date"
          value={date}
          today={overview.day}
          locale={locale}
        />
        <span className="rounded-md bg-paper px-4 py-2.5 text-[15px]">
          {t("sales.total")}:{" "}
          <b className="tabular">
            {money(
              live.reduce((a, s) => a + s.total, 0),
              locale,
            )}
          </b>
          <span className="mx-2 text-line-strong">|</span>
          {t("sales.paid")}:{" "}
          <b className="tabular text-paid">
            {money(
              live.reduce((a, s) => a + s.paid, 0),
              locale,
            )}
          </b>
        </span>
      </div>

      {sales.length === 0 ? (
        <Card>
          <EmptyState title={t("sales.none")} />
        </Card>
      ) : (
        <Card className="animate-rise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-normal">{t("sales.ref")}</th>
                  <th className="px-3 py-3 font-normal">{t("sales.time")}</th>
                  <th className="px-3 py-3 font-normal">{t("sales.items")}</th>
                  <th className="px-3 py-3 font-normal">{t("sales.customer")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("sales.total")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("sales.paid")}</th>
                  <th className="px-5 py-3 text-right font-normal" />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const voided = s.status === "void";
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-[#eef3f2] align-top ${voided ? "text-ink-3" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/shop/${unit}/sales/${s.id}`}
                          className={`font-mono text-[13px] text-haram hover:underline ${voided ? "line-through" : ""}`}
                        >
                          {s.ref}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-ink-3">
                        {timeText(s.soldAt, locale)}
                      </td>
                      <td className="max-w-72 px-3 py-3 text-[14px]">{s.items}</td>
                      <td className="px-3 py-3 text-[14px]">
                        {s.customerName ?? <span className="text-ink-3">{t("sales.walkIn")}</span>}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-semibold">
                        {money(s.total, locale)}
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        {money(s.paid, locale)}
                        {s.paid > 0 ? (
                          <span className="block text-[12px] text-ink-3">{tm(s.method)}</span>
                        ) : null}
                        {s.total > s.paid && !voided ? (
                          <span className="block text-[12px] font-semibold text-due">
                            {t("sales.due")} {money(s.total - s.paid, locale)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {voided ? (
                          <Badge tone="due">{t("sales.voided")}</Badge>
                        ) : canVoid ? (
                          <VoidButton target={{ kind: "sale", unit, id: s.id }} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
