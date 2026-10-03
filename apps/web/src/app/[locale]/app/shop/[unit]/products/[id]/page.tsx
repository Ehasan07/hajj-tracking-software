import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { daysUntil, type ShopUnit } from "@hajj/core";
import { Reveal } from "@/components/reveal";
import { Badge, buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { ProductForm } from "../product-form";
import { AdjustStockForm, ReceiveStockForm } from "./stock-forms";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit; id: string }>;
}) {
  const { locale, unit, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const caller = await api();
  const all = await caller.shop.products({ unit, includeInactive: true });
  const product = all.find((p) => p.id === id);
  if (!product) notFound();
  const [batches, movements, overview] = await Promise.all([
    product.usesBatches ? caller.shop.batches({ unit, productId: id }) : Promise.resolve([]),
    caller.shop.movements({ unit, productId: id }),
    caller.shop.overview({ unit }),
  ]);
  const today = overview.day;
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean) as string[])];
  const live = batches.filter((b) => b.qty > 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/shop/${unit}/products`} className={buttonClass("outline")}>
          ← {t("tabs.products")}
        </Link>
      </div>

      <Card className="flex animate-rise flex-wrap items-end justify-between gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-ink-3">
            {[product.genericName, product.strength, product.category, product.code]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className="tabular mt-1 text-lg font-semibold">
            {money(product.price, locale)} / {product.unitLabel}
            {product.cost !== null ? (
              <span className="ml-3 text-[14px] font-normal text-ink-3">
                {t("products.cost")}: {money(product.cost, locale)}
              </span>
            ) : null}
          </p>
        </div>
        {product.trackStock ? (
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-semibold text-ink-3">{t("products.stock")}</span>
            <span
              className={`tabular text-4xl font-bold ${product.stockQty <= 0 ? "text-due" : ""}`}
            >
              {digits(product.stockQty, locale)}
            </span>
            <span className="text-[13px] text-ink-3">{product.unitLabel}</span>
          </div>
        ) : null}
      </Card>

      <Reveal label={t("products.edit")} variant="outline" plus={false}>
        <ProductForm unit={unit} categories={categories} initial={product} />
      </Reveal>

      {product.trackStock ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("products.receive")}</h2>
            <ReceiveStockForm
              unit={unit}
              productId={product.id}
              usesBatches={product.usesBatches}
              today={today}
            />
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("products.adjust")}</h2>
            <AdjustStockForm
              unit={unit}
              productId={product.id}
              batches={
                product.usesBatches
                  ? live.map((b) => ({
                      id: b.id,
                      label: `${b.batchNo} · ${dateText(b.expiresOn, locale)} · ${digits(b.qty, locale)}`,
                    }))
                  : null
              }
            />
          </Card>
        </div>
      ) : null}

      {product.usesBatches ? (
        <Card className="overflow-hidden">
          <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("products.batches")}</h2>
          {batches.length === 0 ? (
            <p className="px-6 pb-6 text-ink-3">{t("products.noBatches")}</p>
          ) : (
            <table className="w-full text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-6 py-2.5 font-normal">{t("products.batchNo")}</th>
                  <th className="px-3 py-2.5 font-normal">{t("products.expiresOn")}</th>
                  <th className="px-6 py-2.5 text-right font-normal">{t("products.qty")}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const left = daysUntil(b.expiresOn, today);
                  return (
                    <tr
                      key={b.id}
                      className={`border-t border-[#eef3f2] ${b.qty === 0 ? "text-ink-3" : ""}`}
                    >
                      <td className="px-6 py-3 font-mono text-[14px]">{b.batchNo}</td>
                      <td className="px-3 py-3">
                        {dateText(b.expiresOn, locale)}{" "}
                        {b.qty > 0 && left <= 60 ? (
                          <Badge tone={left < 0 ? "due" : "pending"}>
                            {left < 0
                              ? t("products.expired")
                              : t("products.daysLeft", { n: digits(left, locale) })}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="tabular px-6 py-3 text-right font-semibold">
                        {digits(b.qty, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      ) : null}

      {movements.length > 0 ? (
        <Card className="overflow-hidden">
          <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("products.movements")}</h2>
          <ul>
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 border-t border-[#eef3f2] px-6 py-3 text-[15px]"
              >
                <span className={`tabular w-16 font-bold ${m.qty > 0 ? "text-paid" : "text-due"}`}>
                  {m.qty > 0 ? "+" : "−"}
                  {digits(Math.abs(m.qty), locale)}
                </span>
                <span className="font-semibold">{t(`products.reasons.${m.reason}`)}</span>
                {m.saleRef ? (
                  <span className="font-mono text-[13px] text-ink-3">{m.saleRef}</span>
                ) : null}
                {m.batchNo ? (
                  <span className="font-mono text-[13px] text-ink-3">{m.batchNo}</span>
                ) : null}
                {m.note ? <span className="text-[13px] text-ink-2">{m.note}</span> : null}
                <span className="ml-auto text-[13px] text-ink-3">
                  {dateText(m.createdAt, locale, true)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
