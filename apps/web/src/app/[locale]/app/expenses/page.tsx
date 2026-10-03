import { getTranslations, setRequestLocale } from "next-intl/server";
import { monthRange, periodKey, type BusinessUnit } from "@hajj/core";
import { ExpenseForm } from "@/components/expense-form";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";
import { Badge, Card, EmptyState } from "@/components/ui";
import { VoidButton } from "@/components/void-button";
import { dateText, money, type Locale } from "@/lib/format";
import { categoryLabel } from "@/lib/ledger-labels";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const caller = await api();
  const [settings, me] = await Promise.all([caller.tenant.settings(), caller.tenant.me()]);
  if (!BOOK_ROLES.includes(me.role)) return <NoAccess />;
  const today = periodKey(new Date(), "day", settings?.timeZone);
  const month =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) && sp.month <= today.slice(0, 7)
      ? sp.month
      : today.slice(0, 7);
  const { from, to } = monthRange(month);
  const rows = await caller.expenses.list({ from, to });
  const live = rows.filter((r) => !r.voidedAt);
  const units: BusinessUnit[] = (
    ["office", "hajj", "zamzam", "medicine", "coffee", "supernova"] as const
  ).filter((u) => settings?.enabledUnits.includes(u));

  // Totals per category, per currency, for the month.
  const byCategory = new Map<string, { BDT: number; SAR: number }>();
  for (const e of live) {
    const row = byCategory.get(e.category) ?? { BDT: 0, SAR: 0 };
    row[e.currency] += e.amount;
    byCategory.set(e.category, row);
  }
  const totalBdt = live.filter((e) => e.currency === "BDT").reduce((a, e) => a + e.amount, 0);

  return (
    <PageBody>
      <PageHeader title={t("expenses.title")} subtitle={t("expenses.subtitle")} />

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold">{t("shop.daily.addExpense")}</h2>
        <ExpenseForm
          unit="office"
          shop={false}
          today={today}
          canBackdate={BOOK_ROLES.includes(me.role)}
          units={units}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav
          base="/app/expenses"
          keyName="month"
          value={month}
          today={today}
          locale={locale}
        />
        <span className="rounded-md bg-paper px-4 py-2.5 text-[15px]">
          {t("statements.total")}: <b className="tabular text-due">{money(totalBdt, locale)}</b>
        </span>
      </div>

      {byCategory.size ? (
        <div className="flex flex-wrap gap-3">
          {[...byCategory].map(([c, v]) => (
            <Card key={c} className="flex flex-col gap-0.5 px-5 py-3">
              <span className="text-[13px] text-ink-3">{categoryLabel(t, c)}</span>
              <span className="tabular text-lg font-bold">{money(v.BDT, locale)}</span>
              {v.SAR ? (
                <span className="tabular text-[13px] text-ink-2">
                  {money(v.SAR, locale, "SAR")}
                </span>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={t("expenses.none")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-normal">{t("statements.day")}</th>
                  <th className="px-3 py-3 font-normal">{t("shop.daily.category")}</th>
                  <th className="px-3 py-3 font-normal">{t("expenses.unit")}</th>
                  <th className="px-3 py-3 font-normal">{t("shop.daily.payee")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("shop.daily.amount")}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-t border-[#eef3f2] ${e.voidedAt ? "text-ink-3" : ""}`}
                  >
                    <td className="px-5 py-3 text-[14px]">{dateText(e.businessDate, locale)}</td>
                    <td className="px-3 py-3">
                      <b className={`font-semibold ${e.voidedAt ? "line-through" : ""}`}>
                        {categoryLabel(t, e.category)}
                      </b>
                      {e.note ? (
                        <span className="block text-[13px] text-ink-3">{e.note}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[14px]">{t(`units.${e.unit}`)}</td>
                    <td className="px-3 py-3 text-[14px]">
                      {e.payee ?? "—"}
                      <span className="block text-[12px] text-ink-3">
                        {t(`methods.${e.method}`)}
                        {e.reference ? ` · ${e.reference}` : ""}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 text-right font-bold">
                      {money(e.amount, locale, e.currency)}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {e.voidedAt ? (
                        <Badge tone="due">{t("shop.sales.voided")}</Badge>
                      ) : (
                        <VoidButton target={{ kind: "expense", id: e.id }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageBody>
  );
}
