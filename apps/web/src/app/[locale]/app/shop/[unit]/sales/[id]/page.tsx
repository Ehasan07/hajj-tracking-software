import { getTranslations, setRequestLocale } from "next-intl/server";
import { amountInWords, type ShopUnit } from "@hajj/core";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { UNIT_THEME } from "@/lib/units";
import { api } from "@/trpc/server";

export default async function SaleReceipt({
  params,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit; id: string }>;
}) {
  const { locale, unit, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { sale, customer, agency, items, balance } = await (await api()).shop.sale({ unit, id });
  const theme = UNIT_THEME[unit];
  const voided = sale.status === "void";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/app/shop/${unit}/sales?date=${sale.businessDate}`}
          className={buttonClass("outline")}
        >
          ← {t("shop.receipt.back")}
        </Link>
        <PrintButton />
      </div>

      <PrintDoc
        size="a6"
        className="relative mx-auto flex w-full max-w-[440px] animate-rise flex-col gap-4 overflow-hidden rounded-lg bg-paper p-6 shadow-[0_30px_60px_-36px_rgb(18_48_46/0.5)] print:max-w-none print:p-0"
      >
        <span className="absolute inset-x-0 top-0 h-2" style={{ background: theme.color }} />
        <header className="flex flex-col items-center gap-1 pt-2 text-center">
          <Khatam className="h-8 w-8" strokeWidth={7} />
          <b className="text-lg leading-tight">{t(`units.${unit}`)}</b>
          <span className="text-[13px] text-ink-2">{agency.legalName}</span>
          <span className="text-[11px] text-ink-3">
            {[agency.address, agency.phone].filter(Boolean).join(" · ")}
          </span>
        </header>

        <div className="flex items-center justify-between border-y border-dashed border-line-strong py-2 text-[13px]">
          <span className="flex flex-col">
            <span className="font-display text-base" style={{ color: theme.color }}>
              {t("shop.receipt.title")}
            </span>
            <span className="font-mono">{sale.ref}</span>
          </span>
          <span className="text-right text-ink-2">{dateText(sale.soldAt, locale, true)}</span>
        </div>

        {customer ? (
          <p className="text-[14px]">
            <b>{customer.name}</b>
            {customer.area ? <span className="text-ink-3"> · {customer.area}</span> : null}
          </p>
        ) : null}

        <table className="w-full text-[14px]">
          <thead className="text-left text-[12px] text-ink-3">
            <tr>
              <th className="pb-1 font-normal">{t("shop.receipt.item")}</th>
              <th className="pb-1 text-right font-normal">{t("shop.receipt.qty")}</th>
              <th className="pb-1 text-right font-normal">{t("shop.receipt.rate")}</th>
              <th className="pb-1 text-right font-normal">{t("shop.receipt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={n} className="border-t border-[#eef3f2] align-top">
                <td className="py-1.5 pr-2">
                  {i.name}
                  {i.batchNo && i.expiresOn ? (
                    <span className="block text-[11px] text-ink-3">
                      {t("shop.receipt.batch", {
                        no: i.batchNo,
                        date: dateText(i.expiresOn, locale),
                      })}
                    </span>
                  ) : null}
                </td>
                <td className="tabular py-1.5 text-right">{digits(i.qty, locale)}</td>
                <td className="tabular py-1.5 text-right">{money(i.unitPrice, locale)}</td>
                <td className="tabular py-1.5 text-right font-semibold">
                  {money(i.lineTotal, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="grid grid-cols-[1fr_auto] gap-y-1 border-t border-dashed border-line-strong pt-3 text-[14px]">
          {sale.discount > 0 ? (
            <>
              <dt className="text-ink-2">{t("shop.receipt.subtotal")}</dt>
              <dd className="tabular text-right">{money(sale.subtotal, locale)}</dd>
              <dt className="text-ink-2">{t("shop.receipt.discount")}</dt>
              <dd className="tabular text-right">− {money(sale.discount, locale)}</dd>
            </>
          ) : null}
          <dt className="text-base font-bold">{t("shop.receipt.total")}</dt>
          <dd className="tabular text-right text-lg font-bold">
            {money(sale.total, locale, "BDT", false)}
          </dd>
          <dt className="text-ink-2">
            {t("shop.receipt.paid")} ({t(`methods.${sale.method}`)})
          </dt>
          <dd className="tabular text-right">{money(sale.paid, locale)}</dd>
          {sale.total > sale.paid ? (
            <>
              <dt className="font-semibold text-due">{t("shop.receipt.due")}</dt>
              <dd className="tabular text-right font-semibold text-due">
                {money(sale.total - sale.paid, locale)}
              </dd>
            </>
          ) : null}
          {balance !== null && balance > 0 ? (
            <>
              <dt className="text-ink-2">{t("shop.receipt.balance")}</dt>
              <dd className="tabular text-right font-semibold">{money(balance, locale)}</dd>
            </>
          ) : null}
        </dl>
        <p className="text-[12px] text-ink-3">{amountInWords(sale.total, "BDT", locale)}</p>

        {voided ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-xl border-[3px] border-double border-due px-6 py-2 text-3xl font-extrabold tracking-widest text-due">
            {t("shop.receipt.void")}
          </div>
        ) : null}

        <footer className="border-t border-dashed border-line-strong pt-3 text-center text-[12px] text-ink-2">
          {t("shop.receipt.thanks")}
        </footer>
      </PrintDoc>
    </>
  );
}
