import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageBody } from "@/components/page-header";
import { buttonClass, Card, Khatam } from "@/components/ui";
import { UnitIcon } from "@/components/unit-icon";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { isShopUnit, MANAGER_ROLES, UNIT_THEME } from "@/lib/units";
import { api } from "@/trpc/server";
import { ShopTabs } from "./shop-tabs";

export default async function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; unit: string }>;
}) {
  const { unit } = await params;
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  if (!isShopUnit(unit)) notFound();
  const t = await getTranslations();
  const caller = await api();
  const [me, access] = await Promise.all([caller.tenant.me(), caller.shop.access()]);
  const theme = UNIT_THEME[unit];

  const header = (
    <div className="flex animate-rise flex-wrap items-center gap-4">
      <span
        className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[26px_26px_10px_10px]"
        style={{ background: theme.tint }}
      >
        <UnitIcon unit={unit} size={30} tint="var(--color-paper)" />
      </span>
      <div className="flex min-w-0 flex-col">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`units.${unit}`)}</h1>
        <p className="text-[14px] text-ink-3">{t(`shop.taglines.${unit}`)}</p>
      </div>
    </div>
  );

  if (!me.shops.includes(unit)) {
    const reason = !access.enabled.includes(unit)
      ? "disabled"
      : !access.inPlan.includes(unit)
        ? "plan"
        : "noAccess";
    return (
      <PageBody>
        {header}
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Khatam className="h-14 w-14" strokeWidth={3} />
          <p className="text-lg font-semibold">{t("shop.locked.title")}</p>
          <p className="max-w-md text-[15px] text-ink-3">{t(`shop.locked.${reason}`)}</p>
          {reason === "disabled" && MANAGER_ROLES.includes(me.role) ? (
            <Link href="/app/team" className={buttonClass("outline")}>
              {t("shop.locked.settings")}
            </Link>
          ) : null}
        </Card>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div className="flex flex-col gap-4 print:hidden">
        {header}
        <ShopTabs unit={unit} color={theme.color} />
      </div>
      {children}
    </PageBody>
  );
}
