import { getTranslations, setRequestLocale } from "next-intl/server";
import { daysUntil, type ShopUnit } from "@hajj/core";
import { SearchIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { ProductForm } from "./product-form";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations("shop");
  const caller = await api();
  const [products, expiring] = await Promise.all([
    caller.shop.products({ unit, q, includeInactive: true }),
    unit === "medicine" ? caller.shop.expiring({ unit, days: 60 }) : Promise.resolve(null),
  ]);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean) as string[])];

  return (
    <>
      <Reveal label={t("products.add")}>
        <ProductForm unit={unit} categories={categories} />
      </Reveal>

      {expiring && expiring.rows.length > 0 ? (
        <Card className="flex animate-rise flex-col gap-3 border-l-4 border-due p-5">
          <h2 className="text-lg font-bold text-due">{t("products.expiringTitle")}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {expiring.rows.map((b) => {
              const left = daysUntil(b.expiresOn, expiring.today);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[15px]">
                  <Link
                    href={`/app/shop/${unit}/products/${b.productId}`}
                    className="font-semibold hover:text-haram"
                  >
                    {b.name} {b.strength ?? ""}
                  </Link>
                  <span className="font-mono text-[13px] text-ink-3">{b.batchNo}</span>
                  <span className="tabular text-ink-2">
                    {digits(b.qty, locale)} {b.unitLabel}
                  </span>
                  <span className="ml-auto">
                    <Badge tone={left < 0 ? "due" : "pending"}>
                      {left < 0
                        ? t("products.expired")
                        : t("products.daysLeft", { n: digits(left, locale) })}{" "}
                      · {dateText(b.expiresOn, locale)}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <form method="get" role="search">
        <label className="flex h-12 items-center gap-3 rounded-lg border-[1.5px] border-line-strong bg-paper px-4 focus-within:border-haram">
          <SearchIcon size={20} className="text-haram" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("pos.search")}
            aria-label={t("pos.search")}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
      </form>

      {products.length === 0 ? (
        <Card>
          <EmptyState title={t("products.none")} />
        </Card>
      ) : (
        <Card className="animate-rise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-normal">{t("products.name")}</th>
                  <th className="px-3 py-3 font-normal">{t("products.category")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("products.price")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("products.stock")}</th>
                  {unit === "medicine" ? (
                    <th className="px-3 py-3 font-normal">{t("products.nextExpiry")}</th>
                  ) : null}
                  <th className="px-5 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low =
                    p.trackStock && p.reorderLevel !== null && p.stockQty <= p.reorderLevel;
                  const out = p.trackStock && p.stockQty <= 0;
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-[#eef3f2] hover:bg-field ${p.active ? "" : "text-ink-3"}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/app/shop/${unit}/products/${p.id}`} className="flex flex-col">
                          <b className="font-semibold hover:text-haram">{p.name}</b>
                          <span className="text-[12px] text-ink-3">
                            {[p.genericName, p.strength, p.code].filter(Boolean).join(" · ")}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-2">{p.category ?? "—"}</td>
                      <td className="tabular px-3 py-3 text-right font-semibold">
                        {money(p.price, locale)}
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        {p.trackStock ? (
                          <span
                            className={
                              out ? "font-bold text-due" : low ? "font-bold text-saffron-ink" : ""
                            }
                          >
                            {digits(p.stockQty, locale)} {p.unitLabel}
                          </span>
                        ) : (
                          <span className="text-ink-3">{t("pos.noStockTracking")}</span>
                        )}
                      </td>
                      {unit === "medicine" ? (
                        <td className="px-3 py-3 text-[13px] text-ink-2">
                          {p.nextExpiry ? dateText(p.nextExpiry, locale) : "—"}
                        </td>
                      ) : null}
                      <td className="px-5 py-3 text-right">
                        {!p.active ? (
                          <Badge>{t("products.inactive")}</Badge>
                        ) : out ? (
                          <Badge tone="due">{t("products.out")}</Badge>
                        ) : low ? (
                          <Badge tone="pending">{t("products.low")}</Badge>
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
