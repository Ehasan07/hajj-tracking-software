import { getTranslations, setRequestLocale } from "next-intl/server";
import { BUSINESS_UNITS, type BusinessUnit } from "@hajj/core";
import { CheckIcon, KaabaIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui";
import { digits, money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { EditToggle, PlanForm, type PlanDraft } from "./plan-form";

const amount = (minor: number) => (minor / 100).toFixed(2).replace(/\.00$/, "");

export default async function PlansPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [plans, agencies] = await Promise.all([caller.platform.plans(), caller.platform.agencies()]);
  const unitLabels = Object.fromEntries(BUSINESS_UNITS.map((u) => [u, t(`units.${u}`)])) as Record<BusinessUnit, string>;
  const limit = (v: number | null) => (v === null ? t("admin.plans.unlimited") : digits(v, locale));
  const draft = (p: (typeof plans)[number]): PlanDraft => ({
    id: p.id,
    code: p.code,
    nameBn: p.nameBn,
    nameEn: p.nameEn,
    taglineBn: p.taglineBn,
    taglineEn: p.taglineEn,
    priceMonthly: amount(p.priceMonthly),
    priceYearly: amount(p.priceYearly),
    pilgrimsPerYear: p.limits.pilgrimsPerYear,
    staffSeats: p.limits.staffSeats,
    smsPerMonth: p.limits.smsPerMonth,
    units: p.units,
    customDomain: p.customDomain,
    sortOrder: p.sortOrder,
    active: p.active,
  });

  return (
    <PageBody>
      <PageHeader title={t("admin.plans.title")} subtitle={t("admin.plans.subtitle")} />
      <p className="w-fit rounded-md bg-saffron-tint px-4 py-2.5 text-[14px] font-semibold text-saffron-ink">{t("admin.plans.placeholder")}</p>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {plans.map((p, i) => {
          const count = agencies.filter((a) => a.plan_code === p.code).length;
          return (
            <Card key={p.id} className={`flex animate-rise flex-col gap-4 rounded-[90px_90px_22px_22px] px-7 pt-12 pb-7 ${p.active ? "" : "opacity-70"}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-haram-tint">
                  <KaabaIcon size={30} tint="var(--color-paper)" />
                </span>
                <h2 className="text-2xl font-bold">{locale === "bn" ? p.nameBn : p.nameEn}</h2>
                <p className="text-[14px] text-ink-3">{locale === "bn" ? p.taglineBn : p.taglineEn}</p>
                <p className="tabular text-3xl font-bold text-haram">
                  {money(p.priceMonthly, locale)}
                  <span className="text-base font-semibold text-ink-3">{t("admin.plans.perMonth")}</span>
                </p>
                <p className="tabular text-[14px] text-ink-2">
                  {money(p.priceYearly, locale)}
                  {t("admin.plans.perYear")}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge tone={p.active ? "paid" : "neutral"}>{p.active ? t("admin.plans.active") : t("admin.plans.inactive")}</Badge>
                  <Badge tone="info">{t("admin.plans.agencies", { n: digits(count, locale) })}</Badge>
                </div>
              </div>
              <ul className="flex flex-col gap-2 border-t border-dashed border-line pt-4 text-[15px]">
                <li className="flex justify-between gap-2"><span className="text-ink-3">{t("admin.plans.pilgrims")}</span><b>{limit(p.limits.pilgrimsPerYear)}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-3">{t("admin.plans.staff")}</span><b>{limit(p.limits.staffSeats)}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-3">{t("admin.plans.sms")}</span><b>{limit(p.limits.smsPerMonth)}</b></li>
                {p.units.map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <CheckIcon size={16} className="text-paid" />
                    {unitLabels[u]}
                  </li>
                ))}
                {p.customDomain ? (
                  <li className="flex items-center gap-2">
                    <CheckIcon size={16} className="text-paid" />
                    {t("admin.plans.customDomain")}
                  </li>
                ) : null}
              </ul>
              <EditToggle label={t("admin.plans.edit")}>
                <PlanForm plan={draft(p)} unitLabels={unitLabels} />
              </EditToggle>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold">{t("admin.plans.new")}</h2>
        <PlanForm
          plan={{ code: "", nameBn: "", nameEn: "", taglineBn: "", taglineEn: "", priceMonthly: "", priceYearly: "", pilgrimsPerYear: null, staffSeats: null, smsPerMonth: null, units: ["hajj", "office"], customDomain: false, sortOrder: (plans.length + 1) * 10, active: true }}
          unitLabels={unitLabels}
        />
      </Card>
    </PageBody>
  );
}
