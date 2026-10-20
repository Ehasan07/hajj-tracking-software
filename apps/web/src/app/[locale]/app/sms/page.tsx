import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui";
import { dateText, digits, phoneText, type Locale } from "@/lib/format";
import { MANAGER_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { NoticeForm, ReceiptToggle } from "./sms-forms";

const STATUS_TONE = { sent: "paid", queued: "pending", sending: "pending", failed: "due", expired: "due", skipped: "neutral" } as const;

export default async function SmsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sms");
  const caller = await api();
  const me = await caller.tenant.me();
  if (!MANAGER_ROLES.includes(me.role)) return <NoAccess />;
  const [overview, packages] = await Promise.all([caller.sms.overview(), caller.packages.list()]);
  // No SMS provider on this server: the page isn't offered at all.
  if (!overview.available) notFound();
  const { quota } = overview;
  const pct = quota.limit ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  return (
    <PageBody>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="flex flex-col gap-4 p-6 lg:col-span-5">
          <h2 className="text-lg font-bold">{t("quota.title")}</h2>
          <p className="flex items-baseline gap-2">
            <b className="tabular text-4xl text-haram">{digits(quota.used, locale)}</b>
            <span className="text-ink-2">{quota.limit == null ? t("quota.unlimited") : t("quota.of", { n: digits(quota.limit, locale) })}</span>
          </p>
          {quota.limit != null ? (
            <div className="h-2.5 overflow-hidden rounded-full bg-ground" role="img" aria-label={t("quota.left", { n: digits(quota.remaining ?? 0, locale) })}>
              <div className={`h-full rounded-full ${pct > 90 ? "bg-due" : pct > 70 ? "bg-saffron-deep" : "bg-paid"}`} style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <p className="text-[13px] text-ink-3">{t("quota.hint")}</p>
          <div className="border-t border-line pt-4">
            <ReceiptToggle on={overview.smsReceipts} />
          </div>
        </Card>

        <Card className="p-6 lg:col-span-7">
          <h2 className="mb-4 text-lg font-bold">{t("notice.title")}</h2>
          <NoticeForm packages={packages.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))} remaining={quota.remaining} />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("history.notices")}</h2>
        {overview.batches.length === 0 ? (
          <p className="px-6 pb-6 text-ink-3">{t("history.noNotices")}</p>
        ) : (
          <ul>
            {overview.batches.map((b) => (
              <li key={b.batchId} className="flex flex-wrap items-start gap-4 border-t border-line px-6 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="line-clamp-2 text-[15px]">{b.body}</p>
                  <span className="text-[13px] text-ink-3">{b.at ? dateText(b.at, locale, true) : ""}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[13px]">
                  <Badge tone="neutral">{t("history.to", { n: digits(b.total, locale) })}</Badge>
                  {b.sent ? <Badge tone="paid">{t("history.sent", { n: digits(b.sent, locale) })}</Badge> : null}
                  {b.total - b.sent - b.failed - b.skipped > 0 ? <Badge tone="pending">{t("history.waiting", { n: digits(b.total - b.sent - b.failed - b.skipped, locale) })}</Badge> : null}
                  {b.failed ? <Badge tone="due">{t("history.failed", { n: digits(b.failed, locale) })}</Badge> : null}
                  {b.skipped ? <Badge tone="neutral">{t("history.skipped", { n: digits(b.skipped, locale) })}</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("history.receipts")}</h2>
        {overview.receipts.length === 0 ? (
          <p className="px-6 pb-6 text-ink-3">{t("history.noReceipts")}</p>
        ) : (
          <ul>
            {overview.receipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-3 text-[14px]">
                <span className="w-36 shrink-0 font-semibold">{phoneText(r.toPhone, locale)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.body}</span>
                <span className="text-ink-3">{dateText(r.createdAt, locale, true)}</span>
                <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>{t(`status.${r.status as keyof typeof STATUS_TONE}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageBody>
  );
}
