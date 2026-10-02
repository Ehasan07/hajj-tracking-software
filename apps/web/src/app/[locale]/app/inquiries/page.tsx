import { getTranslations, setRequestLocale } from "next-intl/server";
import { PhoneIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, buttonClass, Card, EmptyState, RefChip } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, phoneText, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { InquiryActions, InquiryForm } from "./inquiry-form";

const TONE = { new: "pending", follow_up: "info", converted: "paid", closed: "neutral" } as const;
const FILTERS = ["all", "new", "follow_up", "converted", "closed"] as const;

export default async function InquiriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as (typeof FILTERS)[number]) && status !== "all" ? (status as "new") : undefined;
  const t = await getTranslations();
  const caller = await api();
  const [list, packages, counts] = await Promise.all([
    caller.inquiries.list({ status: filter }),
    caller.packages.list({ activeOnly: true }),
    caller.inquiries.counts(),
  ]);

  return (
    <PageBody>
      <PageHeader title={t("inquiries.title")} subtitle={t("inquiries.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="h-fit animate-rise p-6 lg:sticky lg:top-6 lg:col-span-5">
          <h2 className="mb-5 text-lg font-bold">{t("inquiries.new")}</h2>
          <InquiryForm packages={packages.map((p) => ({ id: p.id, name: p.name }))} />
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <nav className="flex flex-wrap gap-2" aria-label={t("inquiries.title")}>
            {FILTERS.map((f) => {
              const active = (filter ?? "all") === f;
              const count = f === "all" ? Object.values(counts).reduce((a, n) => a + (n ?? 0), 0) : (counts[f] ?? 0);
              return (
                <Link
                  key={f}
                  href={f === "all" ? "/app/inquiries" : `/app/inquiries?status=${f}`}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                    active ? "bg-ink text-paper" : "bg-paper text-ink-2 hover:bg-haram-tint"
                  }`}
                >
                  {f === "all" ? t("common.all") : t(`inquiryStatus.${f}`)}
                  <span className={active ? "text-saffron" : "text-ink-3"}>{digits(count, locale)}</span>
                </Link>
              );
            })}
          </nav>

          {list.length === 0 ? (
            <Card>
              <EmptyState title={t("inquiries.empty")} body={t("inquiries.emptyBody")} />
            </Card>
          ) : (
            list.map((iq, i) => (
              <Card key={iq.id} className="flex animate-rise flex-col gap-3 p-5" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-lg">{iq.name}</b>
                      <Badge tone={TONE[iq.status]}>{t(`inquiryStatus.${iq.status}`)}</Badge>
                    </div>
                    <a href={`tel:${iq.phone}`} className="inline-flex items-center gap-1.5 text-[15px] text-haram">
                      <PhoneIcon size={16} />
                      {phoneText(iq.phone, locale)}
                    </a>
                  </div>
                  <RefChip>{iq.ref}</RefChip>
                </div>
                <p className="text-[15px] text-ink-2">
                  {t(`interest.${iq.interest}`)}
                  {iq.packageName ? ` · ${iq.packageName}` : ""}
                  {iq.partySize > 1 ? ` · ${t("inquiries.people", { count: digits(iq.partySize, locale) })}` : ""}
                  {iq.followUpOn ? ` · ${t("inquiries.followUpOn")}: ${dateText(iq.followUpOn, locale)}` : ""}
                </p>
                {iq.notes ? <p className="rounded-md bg-ground px-4 py-3 text-[15px] leading-relaxed">{iq.notes}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3">
                  <span className="text-[13px] text-ink-3">{dateText(iq.createdAt, locale, true)}</span>
                  <div className="flex flex-wrap gap-2">
                    <InquiryActions id={iq.id} status={iq.status} />
                    {iq.status === "converted" && iq.convertedPilgrimId ? (
                      <Link href={`/app/pilgrims/${iq.convertedPilgrimId}`} className={buttonClass("outline", "h-10")}>
                        {t("inquiries.viewPilgrim")}
                      </Link>
                    ) : iq.status !== "closed" ? (
                      <Link href={`/app/pilgrims/new?inquiry=${iq.id}`} className={buttonClass("primary", "h-10")}>
                        {t("inquiries.convert")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageBody>
  );
}
