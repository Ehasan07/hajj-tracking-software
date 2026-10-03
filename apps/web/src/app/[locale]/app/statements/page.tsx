import { getTranslations, setRequestLocale } from "next-intl/server";
import { BUSINESS_UNITS, periodKey, type BusinessUnit } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, timeText, type Locale } from "@/lib/format";
import { categoryLabel, sourceLabel } from "@/lib/ledger-labels";
import { keyLabel, periodOf, qs, shortDay } from "@/lib/period";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";

const UNIT_COLOR: Record<BusinessUnit, string> = {
  hajj: "var(--color-unit-hajj)",
  medicine: "var(--color-unit-medicine)",
  zamzam: "var(--color-unit-zamzam)",
  coffee: "var(--color-unit-coffee)",
  supernova: "var(--color-unit-supernova)",
  office: "var(--color-unit-office)",
};

const validKey = (k?: string) => Boolean(k && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(k));

export default async function StatementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ key?: string; unit?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const caller = await api();
  const [settings, me] = await Promise.all([caller.tenant.settings(), caller.tenant.me()]);
  if (!BOOK_ROLES.includes(me.role)) return <NoAccess />;
  const unit = (BUSINESS_UNITS as readonly string[]).includes(sp.unit ?? "")
    ? (sp.unit as BusinessUnit)
    : undefined;
  const today = periodKey(new Date(), "day", settings?.timeZone);
  const key = validKey(sp.key) && sp.key! <= today ? sp.key! : today;
  const s = await caller.statements.summary({ key, unit });
  const period = periodOf(key);
  const bdt = s.currencies.find((c) => c.currency === "BDT")!;
  const others = s.currencies.filter(
    (c) => c.currency !== "BDT" && (c.totals.count > 0 || c.opening !== 0),
  );
  const units = BUSINESS_UNITS.filter((u) => settings?.enabledUnits.includes(u) || bdt.byUnit[u]);
  const base = "/app/statements";
  const title = t(`statements.title.${period}`);

  return (
    <PageBody>
      <PageHeader
        title={t("nav.statements")}
        subtitle={t("statements.subtitle")}
        actions={<PrintButton />}
      />

      <div className="flex flex-col gap-3 print:hidden">
        <PeriodNav
          base={base}
          value={key}
          today={today}
          locale={locale}
          extra={{ unit }}
          periods={["day", "month", "year"]}
        />
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${base}${qs({ key })}`}
            className={`h-9 rounded-full px-4 py-1.5 text-sm font-semibold ${!unit ? "bg-ink text-white" : "bg-paper text-ink-2"}`}
          >
            {t("statements.allUnits")}
          </Link>
          {units.map((u) => (
            <Link
              key={u}
              href={`${base}${qs({ key, unit: u })}`}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold ${unit === u ? "text-white" : "bg-paper text-ink-2"}`}
              style={unit === u ? { background: UNIT_COLOR[u] } : undefined}
            >
              {unit !== u ? (
                <span className="h-2 w-2 rounded-full" style={{ background: UNIT_COLOR[u] }} />
              ) : null}
              {t(`units.${u}`)}
            </Link>
          ))}
        </div>
      </div>

      <PrintDoc className="flex flex-col gap-5">
        <header className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[60px_60px_22px_22px] bg-haram-night px-7 pt-10 pb-6 text-white print:rounded-none print:bg-transparent print:px-0 print:pt-0 print:text-ink">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] text-[#a9cfc9] print:text-ink-2">
              {s.agency}
              {unit ? ` · ${t(`units.${unit}`)}` : ""}
            </span>
            <h2 className="font-display text-3xl">{title}</h2>
            <span className="text-[15px] text-[#d4ece8] print:text-ink-2">
              {keyLabel(key, locale)}
              {period !== "day" ? ` · ${dateText(s.from, locale)} – ${dateText(s.to, locale)}` : ""}
            </span>
          </div>
          <p className="text-[12px] text-[#a9cfc9] print:text-ink-3">{t("statements.auto")}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: t("statements.opening"), value: bdt.opening, tone: "" },
            { label: t("statements.in"), value: bdt.totals.in, tone: "text-paid" },
            { label: t("statements.out"), value: bdt.totals.out, tone: "text-due" },
            { label: t("statements.closing"), value: bdt.closing, tone: "" },
          ].map((tile) => (
            <Card
              key={tile.label}
              className="flex min-w-0 flex-col gap-1 p-4 sm:p-5 print:border print:border-ink"
            >
              <span className="text-[13px] font-semibold text-ink-3">{tile.label}</span>
              <span className={`tabular text-lg font-bold break-all sm:text-2xl ${tile.tone}`}>
                {money(tile.value, locale)}
              </span>
            </Card>
          ))}
        </div>

        {!unit ? (
          <Card className="overflow-hidden print:border print:border-ink">
            <h3 className="px-6 pt-5 pb-3 text-lg font-bold">{t("statements.byUnit")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[15px] print:min-w-0">
                <thead className="bg-field text-left text-[13px] text-ink-3">
                  <tr>
                    <th className="px-6 py-2.5 font-normal">{t("statements.unit")}</th>
                    <th className="px-3 py-2.5 text-right font-normal">{t("statements.in")}</th>
                    <th className="px-3 py-2.5 text-right font-normal">{t("statements.out")}</th>
                    <th className="px-6 py-2.5 text-right font-normal">{t("statements.net")}</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const f = bdt.byUnit[u] ?? { in: 0, out: 0, net: 0, count: 0 };
                    return (
                      <tr key={u} className="border-t border-[#eef3f2]">
                        <td className="px-6 py-3">
                          <Link
                            href={`${base}${qs({ key, unit: u })}`}
                            className="inline-flex items-center gap-2 font-semibold hover:text-haram"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: UNIT_COLOR[u] }}
                            />
                            {t(`units.${u}`)}
                          </Link>
                        </td>
                        <td className="tabular px-3 py-3 text-right text-paid">
                          {money(f.in, locale)}
                        </td>
                        <td className="tabular px-3 py-3 text-right text-due">
                          {money(f.out, locale)}
                        </td>
                        <td
                          className={`tabular px-6 py-3 text-right font-bold ${f.net < 0 ? "text-due" : ""}`}
                        >
                          {money(f.net, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink font-bold">
                    <td className="px-6 py-3">{t("statements.total")}</td>
                    <td className="tabular px-3 py-3 text-right">{money(bdt.totals.in, locale)}</td>
                    <td className="tabular px-3 py-3 text-right">
                      {money(bdt.totals.out, locale)}
                    </td>
                    <td className="tabular px-6 py-3 text-right">
                      {money(bdt.totals.net, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        ) : null}

        {period !== "day" ? (
          <Card className="overflow-hidden print:border print:border-ink">
            <h3 className="px-6 pt-5 pb-3 text-lg font-bold">
              {period === "month" ? t("statements.days") : t("statements.months")}
            </h3>
            {bdt.rows.length === 0 ? (
              <p className="px-6 pb-6 text-ink-3">{t("statements.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-[15px]">
                  <thead className="bg-field text-left text-[13px] text-ink-3">
                    <tr>
                      <th className="px-6 py-2.5 font-normal">
                        {period === "month" ? t("statements.day") : t("statements.month")}
                      </th>
                      <th className="px-3 py-2.5 text-right font-normal">{t("statements.in")}</th>
                      <th className="px-3 py-2.5 text-right font-normal">{t("statements.out")}</th>
                      <th className="px-3 py-2.5 text-right font-normal">{t("statements.net")}</th>
                      <th className="px-6 py-2.5 text-right font-normal">
                        {t("statements.balance")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bdt.rows.map((r) => (
                      <tr key={r.period} className="border-t border-[#eef3f2] hover:bg-field">
                        <td className="px-6 py-2.5">
                          <Link
                            href={`${base}${qs({ key: r.period, unit })}`}
                            className="font-semibold text-haram hover:underline"
                          >
                            {period === "month"
                              ? shortDay(r.period, locale)
                              : keyLabel(r.period, locale)}
                          </Link>
                          <span className="ml-2 text-[12px] text-ink-3">
                            × {digits(r.count, locale)}
                          </span>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-paid">
                          {money(r.in, locale)}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-due">
                          {money(r.out, locale)}
                        </td>
                        <td
                          className={`tabular px-3 py-2.5 text-right font-semibold ${r.net < 0 ? "text-due" : ""}`}
                        >
                          {money(r.net, locale)}
                        </td>
                        <td className="tabular px-6 py-2.5 text-right font-bold">
                          {money(r.closingBalance, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden print:border print:border-ink">
            <h3 className="px-6 pt-5 pb-3 text-lg font-bold">{t("statements.entries")}</h3>
            {s.entries.length === 0 ? (
              <p className="px-6 pb-6 text-ink-3">{t("statements.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[14.5px]">
                  <thead className="bg-field text-left text-[13px] text-ink-3">
                    <tr>
                      <th className="px-6 py-2.5 font-normal">{t("statements.time")}</th>
                      <th className="px-3 py-2.5 font-normal">{t("statements.detail")}</th>
                      <th className="px-3 py-2.5 text-right font-normal">{t("statements.in")}</th>
                      <th className="px-6 py-2.5 text-right font-normal">{t("statements.out")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.entries.map((e) => (
                      <tr key={e.id} className="border-t border-[#eef3f2] align-top">
                        <td className="px-6 py-2.5 text-[13px] whitespace-nowrap text-ink-3">
                          {timeText(e.occurredAt, locale)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: UNIT_COLOR[e.unit] }}
                            />
                            <b className="font-semibold">{sourceLabel(t, e.sourceType)}</b>
                            <span className="text-[13px] text-ink-2">
                              {categoryLabel(t, e.category)}
                            </span>
                          </span>
                          {e.memo ? (
                            <span className="block text-[13px] text-ink-3">{e.memo}</span>
                          ) : null}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right font-semibold text-paid">
                          {e.direction === "in" ? money(e.amount, locale, e.currency) : ""}
                        </td>
                        <td className="tabular px-6 py-2.5 text-right font-semibold text-due">
                          {e.direction === "out" ? money(e.amount, locale, e.currency) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {s.byCategory.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {(["in", "out"] as const).map((dir) => {
              const list = s.byCategory.filter((c) => c.direction === dir && c.currency === "BDT");
              return (
                <Card key={dir} className="flex flex-col gap-2 p-6 print:border print:border-ink">
                  <h3 className="text-lg font-bold">
                    {dir === "in" ? t("statements.whereFrom") : t("statements.whereTo")}
                  </h3>
                  {list.length === 0 ? (
                    <p className="text-ink-3">—</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 text-[15px]">
                      {list.map((c) => (
                        <li
                          key={`${c.sourceType}-${c.category}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span>
                            {sourceLabel(t, c.sourceType)}
                            {c.category ? (
                              <span className="text-ink-3"> · {categoryLabel(t, c.category)}</span>
                            ) : null}
                            <span className="text-[12px] text-ink-3">
                              {" "}
                              × {digits(c.count, locale)}
                            </span>
                          </span>
                          <b className={`tabular ${dir === "in" ? "text-paid" : "text-due"}`}>
                            {money(c.total, locale)}
                          </b>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        ) : null}

        {others.map((c) => (
          <Card key={c.currency} className="flex flex-col gap-2 p-6 print:border print:border-ink">
            <h3 className="text-lg font-bold">
              {t("statements.otherCurrency", { currency: c.currency })}
            </h3>
            <p className="text-[15px]">
              {t("statements.opening")}{" "}
              <b className="tabular">{money(c.opening, locale, c.currency)}</b> ·{" "}
              {t("statements.in")}{" "}
              <b className="tabular text-paid">{money(c.totals.in, locale, c.currency)}</b> ·{" "}
              {t("statements.out")}{" "}
              <b className="tabular text-due">{money(c.totals.out, locale, c.currency)}</b> ·{" "}
              {t("statements.closing")}{" "}
              <b className="tabular">{money(c.closing, locale, c.currency)}</b>
            </p>
          </Card>
        ))}
      </PrintDoc>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link href="/app/expenses" className={buttonClass("outline")}>
          {t("statements.recordExpense")}
        </Link>
      </div>
    </PageBody>
  );
}
