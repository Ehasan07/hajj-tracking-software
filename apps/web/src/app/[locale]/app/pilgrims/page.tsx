import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlusIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, buttonClass, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { initials, money, phoneText, type Locale } from "@/lib/format";
import { PILGRIM_STATUS_TONE as STATUS_TONE } from "@/lib/status";
import { api } from "@/trpc/server";
import { SearchBox } from "./search-box";

export default async function PilgrimsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 80);
  const t = await getTranslations();
  const caller = await api();
  const rows = query ? await caller.pilgrims.search({ q: query }) : await caller.pilgrims.list();

  return (
    <PageBody>
      <PageHeader
        title={t("pilgrims.title")}
        actions={
          <Link href="/app/pilgrims/new" className={buttonClass("primary")}>
            <PlusIcon size={18} />
            {t("pilgrims.new")}
          </Link>
        }
      />
      <SearchBox defaultValue={query} />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={query ? t("pilgrims.noResults") : t("pilgrims.empty")}
            body={query ? undefined : t("pilgrims.emptyBody")}
          />
        </Card>
      ) : (
        <Card className="animate-rise overflow-hidden [animation-delay:80ms]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-6 py-3 font-normal">{t("pilgrims.name")}</th>
                  <th className="px-3 py-3 font-normal">{t("pilgrims.package")}</th>
                  <th className="px-3 py-3 font-normal">{t("pilgrims.status")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("pilgrims.paid")}</th>
                  <th className="px-6 py-3 text-right font-normal">{t("pilgrims.due")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const due = Math.max(p.packagePrice - p.discount - p.paid, 0);
                  const pct = p.packagePrice - p.discount > 0 ? Math.min(p.paid / (p.packagePrice - p.discount), 1) : 0;
                  return (
                    <tr key={p.id} className="border-t border-[#eef3f2] transition-colors hover:bg-field">
                      <td className="px-6 py-3.5">
                        <Link href={`/app/pilgrims/${p.id}`} className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-haram-tint text-sm font-bold text-haram-deep">
                            {initials(p.fullName)}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <b className="truncate font-semibold">{p.fullName}</b>
                            <span className="text-xs text-ink-3">
                              <span className="font-mono">{p.ref}</span> · {phoneText(p.phone, locale)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-ink-2">{p.packageName ?? "—"}</td>
                      <td className="px-3 py-3.5">
                        <Badge tone={STATUS_TONE[p.status]}>{t(`pilgrimStatus.${p.status}`)}</Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="tabular font-semibold">{money(p.paid, locale, p.currency)}</span>
                        <span className="mt-1.5 ml-auto block h-1.5 w-24 overflow-hidden rounded-full bg-[#e6eeec]">
                          <span className="block h-full rounded-full bg-haram" style={{ width: `${pct * 100}%` }} />
                        </span>
                      </td>
                      <td className={`tabular px-6 py-3.5 text-right font-bold ${due > 0 ? "text-due" : "text-paid"}`}>
                        {money(due, locale, p.currency)}
                      </td>
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
