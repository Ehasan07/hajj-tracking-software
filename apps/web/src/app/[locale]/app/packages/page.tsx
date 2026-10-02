import { getTranslations, setRequestLocale } from "next-intl/server";
import { KaabaIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, Card, EmptyState } from "@/components/ui";
import { digits, money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { PackageForm, PackageToggle } from "./package-form";

export default async function PackagesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [list, me] = await Promise.all([caller.packages.list(), caller.tenant.me()]);
  const canEdit = me.role === "owner" || me.role === "admin";

  return (
    <PageBody>
      <PageHeader title={t("packages.title")} subtitle={t("packages.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          {list.length === 0 ? (
            <Card>
              <EmptyState title={t("packages.empty")} body={t("packages.emptyBody")} />
            </Card>
          ) : (
            list.map((p, i) => (
              <Card
                key={p.id}
                className={`flex animate-rise items-center gap-4 p-5 ${p.active ? "" : "opacity-60"}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[24px_24px_10px_10px] bg-haram-tint">
                  <KaabaIcon size={28} tint="var(--color-paper)" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-lg">{p.name}</b>
                    <Badge tone={p.active ? "paid" : "neutral"}>{p.active ? t("packages.active") : t("packages.inactive")}</Badge>
                  </div>
                  <span className="text-sm text-ink-3">
                    {t(`interest.${p.kind}`)} · {digits(p.season, locale)}
                    {p.days ? ` · ${digits(p.days, locale)} ${locale === "bn" ? "দিন" : "days"}` : ""}
                  </span>
                </div>
                <span className="tabular text-xl font-bold text-haram">{money(p.price, locale, p.currency)}</span>
                {canEdit ? <PackageToggle id={p.id} active={p.active} /> : null}
              </Card>
            ))
          )}
        </div>
        {canEdit ? (
          <Card className="h-fit p-6 lg:col-span-5">
            <h2 className="mb-5 text-lg font-bold">{t("packages.new")}</h2>
            <PackageForm />
          </Card>
        ) : null}
      </div>
    </PageBody>
  );
}
