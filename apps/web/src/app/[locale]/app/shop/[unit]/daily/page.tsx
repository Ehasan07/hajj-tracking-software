import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ShopUnit } from "@hajj/core";
import { ExpenseForm } from "@/components/expense-form";
import { PeriodNav } from "@/components/period-nav";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui";
import { VoidButton } from "@/components/void-button";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { keyLabel } from "@/lib/period";
import { BOOK_ROLES, UNIT_THEME } from "@/lib/units";
import { api } from "@/trpc/server";

export default async function ShopDaily({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  const { date: requested } = await searchParams;
  const t = await getTranslations();
  const caller = await api();
  const me = await caller.tenant.me();
  const first = await caller.shop.daily({ unit });
  const date =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= first.today
      ? requested
      : first.today;
  const d = date === first.today ? first : await caller.shop.daily({ unit, date });
  const theme = UNIT_THEME[unit];
  const books = BOOK_ROLES.includes(me.role);
  // The ledger is the truth for cash; the lines above it explain where it came from.
  const cash = d.ledger.net;
  const adjustments = cash - (d.sales.paid + d.collected - d.expenseTotal);
  const category = (c: string) =>
    t.has(`expenses.categories.${c}`) ? t(`expenses.categories.${c}`) : c;

  const rows: [string, number, string?][] = [
    [t("shop.daily.gross"), d.sales.subtotal],
    [t("shop.daily.discount"), -d.sales.discount],
    [t("shop.daily.net"), d.sales.total, "font-bold"],
    [t("shop.daily.credit"), -d.sales.credit, "text-due"],
    [t("shop.daily.received"), d.sales.paid],
    [t("shop.daily.collections"), d.collected],
    [t("shop.daily.expenses"), -d.expenseTotal],
    ...(adjustments !== 0
      ? ([[t("shop.daily.adjustments"), adjustments]] as [string, number][])
      : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PeriodNav
          base={`/app/shop/${unit}/daily`}
          keyName="date"
          value={date}
          today={first.today}
          locale={locale}
        />
        <PrintButton />
      </div>

      <PrintDoc className="flex flex-col gap-5">
        <header
          className="flex flex-wrap items-end justify-between gap-3 rounded-[60px_60px_18px_18px] px-7 pt-9 pb-6 text-white print:rounded-none print:px-0 print:pt-0 print:text-ink"
          style={{ background: theme.color }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[14px] opacity-85">
              {d.agency} · {t(`units.${unit}`)}
            </span>
            <h2 className="font-display text-3xl">{t("shop.daily.title")}</h2>
            <span className="text-[15px] opacity-90">{keyLabel(date, locale)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[13px] opacity-85">{t("shop.daily.cashInHand")}</span>
            <span className="tabular text-4xl font-bold">{money(cash, locale)}</span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-6 print:border print:border-ink">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-bold">{t("shop.daily.count")}</h3>
              <span className="tabular text-2xl font-bold">{digits(d.sales.count, locale)}</span>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
              {rows.map(([label, value, cls]) => (
                <div key={label} className="contents">
                  <dt className={`text-ink-2 ${cls ?? ""}`}>{label}</dt>
                  <dd className={`tabular text-right ${cls ?? "font-semibold"}`}>
                    {value < 0 ? "− " : ""}
                    {money(Math.abs(value), locale)}
                  </dd>
                </div>
              ))}
              <dt className="border-t-2 border-ink pt-2 text-lg font-bold">
                {t("shop.daily.cashInHand")}
              </dt>
              <dd className="tabular border-t-2 border-ink pt-2 text-right text-lg font-bold">
                {money(cash, locale)}
              </dd>
            </dl>
            <p className="text-[13px] font-semibold text-paid">✓ {t("shop.daily.ledgerOk")}</p>
          </Card>

          <Card className="flex flex-col gap-3 p-6 print:border print:border-ink">
            <h3 className="text-lg font-bold">{t("shop.daily.byMethod")}</h3>
            {d.byMethod.length === 0 && d.collections.length === 0 ? (
              <p className="text-ink-3">{t("shop.daily.none")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center justify-between text-[15px]">
                    <span>
                      {t(`methods.${m.method}`)}{" "}
                      <span className="text-[13px] text-ink-3">× {digits(m.count, locale)}</span>
                    </span>
                    <b className="tabular">{money(m.total, locale)}</b>
                  </li>
                ))}
              </ul>
            )}
            {d.collections.length ? (
              <>
                <h4 className="mt-2 font-bold">{t("shop.daily.collectionsList")}</h4>
                <ul className="flex flex-col gap-1.5 text-[14px]">
                  {d.collections.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span>
                        {c.name} <span className="text-ink-3">· {t(`methods.${c.method}`)}</span>
                      </span>
                      <b className="tabular text-paid">{money(c.amount, locale)}</b>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        </div>

        <Card className="overflow-hidden print:border print:border-ink">
          <h3 className="px-6 pt-5 pb-3 text-lg font-bold">{t("shop.daily.byProduct")}</h3>
          {d.byProduct.length === 0 ? (
            <p className="px-6 pb-6 text-ink-3">{t("shop.daily.none")}</p>
          ) : (
            <table className="w-full text-[15px]">
              <tbody>
                {d.byProduct.map((p) => (
                  <tr key={p.name} className="border-t border-[#eef3f2]">
                    <td className="px-6 py-2.5">{p.name}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-2">
                      × {digits(p.qty, locale)}
                    </td>
                    <td className="tabular px-6 py-2.5 text-right font-semibold">
                      {money(p.total, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-hidden print:border print:border-ink">
          <h3 className="px-6 pt-5 pb-3 text-lg font-bold">{t("shop.daily.expenseList")}</h3>
          {d.expenses.length === 0 ? (
            <p className="px-6 pb-6 text-ink-3">{t("shop.daily.noExpenses")}</p>
          ) : (
            <ul>
              {d.expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 border-t border-[#eef3f2] px-6 py-2.5 text-[15px]"
                >
                  <span className="font-semibold">{category(e.category)}</span>
                  {e.payee ? <span className="text-ink-2">{e.payee}</span> : null}
                  {e.note ? <span className="text-[13px] text-ink-3">{e.note}</span> : null}
                  <b className="tabular ml-auto">{money(e.amount, locale, e.currency)}</b>
                  {books ? (
                    <span className="print:hidden">
                      <VoidButton target={{ kind: "shopExpense", unit, id: e.id }} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {d.voided.length ? (
          <Card className="flex flex-col gap-2 p-6 print:border print:border-ink">
            <h3 className="font-bold text-due">{t("shop.daily.voided")}</h3>
            {d.voided.map((v) => (
              <p key={v.ref} className="text-[14px]">
                <span className="font-mono">{v.ref}</span> · {money(v.total, locale)} ·{" "}
                <span className="text-ink-3">{v.reason}</span>
              </p>
            ))}
          </Card>
        ) : null}

        <p className="hidden text-[11px] text-ink-3 print:block">
          {t("shop.daily.printed")}: {dateText(new Date(), locale, true)}
        </p>
      </PrintDoc>

      <div className="print:hidden">
        <Reveal label={t("shop.daily.addExpense")} variant="outline">
          <ExpenseForm unit={unit} shop today={first.today} canBackdate={books} />
        </Reveal>
      </div>
    </>
  );
}
