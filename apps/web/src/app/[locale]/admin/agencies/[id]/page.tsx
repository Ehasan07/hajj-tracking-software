import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BUSINESS_UNITS, type BusinessUnit } from "@hajj/core";
import { PageBody } from "@/components/page-header";
import { Badge, buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { SUBSCRIPTION_TONE } from "@/lib/status";
import { api } from "@/trpc/server";
import { SubscriptionForm, UnitsForm } from "./forms";

export default async function AgencyPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [agencies, plans] = await Promise.all([caller.platform.agencies(), caller.platform.plans()]);
  const a = agencies.find((x) => x.id === id);
  if (!a) notFound();
  const currentPlan = plans.find((p) => p.code === a.plan_code);
  const iso = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : null);
  const facts: [string, string][] = [
    [t("admin.agencies.owner"), a.owner ? `${a.owner.name} · ${a.owner.email}` : "—"],
    [t("admin.agencies.joined"), dateText(a.created_at, locale)],
    [t("admin.agencies.pilgrims"), digits(a.pilgrims, locale)],
    [t("admin.agencies.staff"), digits(a.staff, locale)],
    [t("admin.agencies.collections"), money(a.collections_this_month, locale)],
    [t("admin.agencies.lastActivity"), a.last_activity ? dateText(a.last_activity, locale, true) : "—"],
    [t("admin.agency.publicHost"), a.public_host ?? `${a.slug} · ${t("admin.agency.noHost")}`],
  ];
  const unitLabels = Object.fromEntries(BUSINESS_UNITS.map((u) => [u, t(`units.${u}`)])) as Record<BusinessUnit, string>;

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/agencies" className={buttonClass("outline", "h-11")}>
          ← {t("admin.nav.agencies")}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{a.name}</h1>
        {a.status ? <Badge tone={SUBSCRIPTION_TONE[a.status]}>{t(`admin.status.${a.status}`)}</Badge> : null}
        {currentPlan ? <Badge tone="info">{locale === "bn" ? currentPlan.nameBn : currentPlan.nameEn}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="flex flex-col gap-5 p-6 lg:col-span-7">
          <h2 className="text-lg font-bold">{t("admin.agency.subscription")}</h2>
          <SubscriptionForm
            tenantId={a.id}
            plans={plans.map((p) => ({ id: p.id, label: `${locale === "bn" ? p.nameBn : p.nameEn} · ${money(p.priceMonthly, locale)}${t("admin.plans.perMonth")}${p.active ? "" : ` (${t("admin.plans.inactive")})`}` }))}
            current={{
              planId: currentPlan?.id ?? null,
              status: a.status,
              cycle: a.cycle,
              trialEndsAt: iso(a.trial_ends_at),
              currentPeriodEnd: iso(a.current_period_end),
              notes: null,
            }}
          />
          <p className="rounded-md bg-saffron-tint px-4 py-3 text-[14px] text-saffron-ink">{t("admin.agency.readOnlyNote")}</p>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("admin.agency.facts")}</h2>
            <dl className="flex flex-col gap-3 text-[15px]">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-ink-3">{label}</dt>
                  <dd className="font-semibold break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-bold">{t("admin.agency.units")}</h2>
              <p className="text-[13px] text-ink-3">{t("admin.agency.unitsHint")}</p>
            </div>
            <UnitsForm tenantId={a.id} enabled={a.enabled_units as BusinessUnit[]} labels={unitLabels} />
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
