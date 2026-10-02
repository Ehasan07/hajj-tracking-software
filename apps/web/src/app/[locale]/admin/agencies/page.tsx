import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { SUBSCRIPTION_TONE as STATUS_TONE } from "@/lib/status";
import { api } from "@/trpc/server";


export default async function AgenciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations("admin");
  const all = await (await api()).platform.agencies();
  const needle = q?.trim().toLowerCase();
  const rows = needle
    ? all.filter((a) => [a.name, a.slug, a.owner?.email ?? "", a.owner?.name ?? ""].some((v) => v.toLowerCase().includes(needle)))
    : all;
  const now = Date.now();

  return (
    <PageBody>
      <PageHeader title={t("agencies.title")} subtitle={digits(all.length, locale)} />
      <form method="get" role="search">
        <label className="flex h-14 items-center gap-3 rounded-lg border-[1.5px] border-line-strong bg-paper px-5 focus-within:border-haram">
          <SearchIcon size={22} className="text-haram" />
          <input name="q" defaultValue={q} placeholder={t("agencies.search")} aria-label={t("agencies.search")} className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
        </label>
      </form>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={t("agencies.empty")} />
        </Card>
      ) : (
        <Card className="animate-rise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-6 py-3 font-normal">{t("agencies.name")}</th>
                  <th className="px-3 py-3 font-normal">{t("agencies.plan")}</th>
                  <th className="px-3 py-3 font-normal">{t("agencies.status")}</th>
                  <th className="px-3 py-3 font-normal">{t("agencies.trialEnds")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("agencies.pilgrims")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("agencies.staff")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("agencies.collections")}</th>
                  <th className="px-6 py-3 text-right font-normal">{t("agencies.lastActivity")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const expired = a.status === "trial" && a.trial_ends_at !== null && new Date(a.trial_ends_at).getTime() < now;
                  return (
                    <tr key={a.id} className="border-t border-[#eef3f2] hover:bg-field">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/agencies/${a.id}`} className="flex flex-col">
                          <b className="font-semibold text-ink hover:text-haram">{a.name}</b>
                          <span className="text-[12px] text-ink-3">{a.owner?.email ?? a.slug}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">{(locale === "bn" ? a.plan_name_bn : a.plan_name_en) ?? "—"}</td>
                      <td className="px-3 py-3.5">
                        <Badge tone={expired ? "due" : a.status ? STATUS_TONE[a.status] : "neutral"}>
                          {expired ? t("status.expired") : t(`status.${a.status ?? "none"}`)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-[13px] text-ink-2">{a.trial_ends_at ? dateText(a.trial_ends_at, locale) : "—"}</td>
                      <td className="tabular px-3 py-3.5 text-right">{digits(a.pilgrims, locale)}</td>
                      <td className="tabular px-3 py-3.5 text-right">{digits(a.staff, locale)}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold">{money(a.collections_this_month, locale)}</td>
                      <td className="px-6 py-3.5 text-right text-[13px] text-ink-3">{a.last_activity ? dateText(a.last_activity, locale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageBody>
  );
}
