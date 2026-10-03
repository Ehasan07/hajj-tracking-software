import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ShopUnit } from "@hajj/core";
import { Card } from "@/components/ui";
import { digits, money, type Locale } from "@/lib/format";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { PosClient } from "./pos-client";

export default async function ShopPos({
  params,
}: {
  params: Promise<{ locale: Locale; unit: ShopUnit }>;
}) {
  const { locale, unit } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const caller = await api();
  const [overview, products, customers, me] = await Promise.all([
    caller.shop.overview({ unit }),
    caller.shop.products({ unit }),
    caller.shop.customers({ unit }),
    caller.tenant.me(),
  ]);

  const tiles = [
    {
      label: t("tiles.todaySales"),
      value: money(overview.sales, locale),
      sub: t("tiles.sales", { n: digits(overview.count, locale) }),
    },
    {
      label: t("tiles.received"),
      value: money(overview.received, locale),
      sub: overview.credit > 0 ? `${t("tiles.credit")}: ${money(overview.credit, locale)}` : null,
    },
    { label: t("tiles.collections"), value: money(overview.collections, locale), sub: null },
    { label: t("tiles.cashInHand"), value: money(overview.cash, locale), sub: null },
    ...(unit === "medicine"
      ? [
          {
            label: t("tiles.expiring"),
            value: digits(overview.expiringSoon, locale),
            sub: `${t("tiles.lowStock")}: ${digits(overview.lowStock, locale)}`,
            warn: overview.expiringSoon > 0,
          },
        ]
      : [
          {
            label: t("tiles.dues"),
            value: money(overview.customersDue, locale),
            sub: overview.lowStock
              ? `${t("tiles.lowStock")}: ${digits(overview.lowStock, locale)}`
              : null,
          },
        ]),
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile, i) => (
          <Card
            key={tile.label}
            className="flex animate-rise flex-col gap-1 p-4"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-[13px] font-semibold text-ink-3">{tile.label}</span>
            <span
              className={`tabular text-xl font-bold sm:text-2xl ${"warn" in tile && tile.warn ? "text-due" : ""}`}
            >
              {tile.value}
            </span>
            {tile.sub ? <span className="text-[12px] text-ink-3">{tile.sub}</span> : null}
          </Card>
        ))}
      </div>

      <PosClient
        unit={unit}
        today={overview.day}
        canBackdate={BOOK_ROLES.includes(me.role)}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          category: p.category,
          genericName: p.genericName,
          strength: p.strength,
          unitLabel: p.unitLabel,
          price: p.price,
          trackStock: p.trackStock,
          stockQty: p.stockQty,
          nextExpiry: p.nextExpiry,
        }))}
        customers={customers
          .filter((c) => c.active)
          .map((c) => ({ id: c.id, name: c.name, area: c.area, balance: c.balance }))}
      />
    </>
  );
}
