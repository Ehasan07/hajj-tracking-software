import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, EmptyState } from "@/components/ui";
import { dateText, digits, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { AdminRevoke } from "./admin-revoke";

export default async function AdminDevicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations("devices");
  const rows = await (await api()).account.allDevices({ q });

  return (
    <PageBody>
      <PageHeader title={t("adminTitle")} subtitle={t("adminSubtitle", { n: digits(rows.length, locale) })} />
      <form method="get" role="search">
        <label className="flex h-14 items-center gap-3 rounded-lg border-[1.5px] border-line-strong bg-paper px-5 focus-within:border-haram">
          <SearchIcon size={22} className="text-haram" />
          <input name="q" defaultValue={q} placeholder={t("adminSearch")} aria-label={t("adminSearch")} className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
        </label>
      </form>
      {rows.length === 0 ? (
        <Card>
          <EmptyState title={t("none")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-6 py-3 font-normal">{t("user")}</th>
                  <th className="px-3 py-3 font-normal">{t("device")}</th>
                  <th className="px-3 py-3 font-normal">IP</th>
                  <th className="px-3 py-3 font-normal">{t("lastSeenCol")}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#eef3f2]">
                    <td className="px-6 py-3">
                      <b className="block">{r.userName}</b>
                      <span className="text-[12px] text-ink-3">{r.userEmail}</span>
                    </td>
                    <td className="px-3 py-3">
                      {r.label}
                      <span className="block text-[12px] text-ink-3">{t("added", { date: dateText(r.createdAt, locale) })}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[13px] text-ink-2">{r.ip ?? "—"}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-2">{dateText(r.lastSeenAt, locale, true)}</td>
                    <td className="px-6 py-2 text-right">
                      <AdminRevoke id={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageBody>
  );
}
