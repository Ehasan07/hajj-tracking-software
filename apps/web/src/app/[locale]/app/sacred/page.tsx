import { getTranslations, setRequestLocale } from "next-intl/server";
import { getItem, ITEMS, STEPS, SUNNAH } from "@hajj/sacred";
import { PageBody } from "@/components/page-header";
import { LabbaikOrnament, StarDivider } from "@/components/sacred";
import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import type { Review } from "@/lib/sacred";
import { api } from "@/trpc/server";
import { ItemCard, ReviewBadge } from "./item-card";
import { ReviewControls } from "./review-controls";

const TABS = ["steps", "ayat", "duas", "hadith", "sunnah"] as const;
type Tab = (typeof TABS)[number];

const KIND_FOR_TAB: Partial<Record<Tab, string[]>> = { ayat: ["ayah", "surah"], duas: ["dua"], hadith: ["hadith"] };

export default async function SacredPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "steps";
  const t = await getTranslations("sacred");
  const caller = await api();
  const [reviews, me] = await Promise.all([caller.sacred.reviews(), caller.tenant.me()]);
  const canReview = ["owner", "admin", "alim"].includes(me.role);
  const review = (id: string) => reviews[id] as Review | undefined;

  const total = ITEMS.length + STEPS.length + SUNNAH.length;
  const done = Object.values(reviews).filter((r) => r.status === "approved").length;

  return (
    <PageBody>
      <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[160px_160px_24px_24px] bg-haram-night px-6 pt-16 pb-8 text-center text-ground sm:px-12">
        <LabbaikOrnament className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[180px] text-[#14635d] sm:text-[240px]" />
        <p className="relative font-hand text-2xl text-saffron">{t("title")}</p>
        <p className="relative mx-auto max-w-2xl text-[15px] leading-relaxed text-[#c7ddd9]">{t("subtitle")}</p>
        <div className="relative mx-auto flex items-center gap-3">
          <span className="h-2 w-48 overflow-hidden rounded-full bg-[#14635d]">
            <span className="block h-full origin-left animate-grow rounded-full bg-saffron" style={{ width: `${(done / total) * 100}%` }} />
          </span>
          <span className="text-sm font-semibold">{t("progress", { done: digits(done, locale), total: digits(total, locale) })}</span>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label={t("title")}>
        {TABS.map((key) => (
          <Link
            key={key}
            href={key === "steps" ? "/app/sacred" : `/app/sacred?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold ${
              tab === key ? "bg-ink text-paper" : "bg-paper text-ink-2 hover:bg-haram-tint"
            }`}
          >
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>

      {tab === "steps" ? (
        <div className="flex flex-col gap-10">
          {(["umrah", "hajj"] as const).map((phase) => (
            <section key={phase} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-3xl">{t(phase)}</h2>
                <StarDivider className="flex-1 text-saffron" />
              </div>
              <ol className="relative flex flex-col gap-6 border-s-2 border-dashed border-line-strong ps-6 sm:ps-10">
                {STEPS.filter((s) => s.phase === phase).map((step) => {
                  const r = review(`step:${step.id}`);
                  const body = r?.status === "approved" && (locale === "bn" ? r.meaningBn[0] : r.meaningEn[0]) ? (locale === "bn" ? r.meaningBn[0] : r.meaningEn[0]) : step.body[locale];
                  return (
                    <li key={step.id} id={step.id} className="relative scroll-mt-24">
                      <span className="absolute top-6 -start-[33px] flex h-4 w-4 items-center justify-center rounded-full bg-saffron ring-4 ring-ground sm:-start-[49px]" />
                      <Card className="flex flex-col gap-4 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge tone="info">{step.label[locale]}</Badge>
                            <h3 className="text-xl font-bold">{step.title[locale]}</h3>
                          </div>
                          <ReviewBadge review={r} t={t} />
                        </div>
                        <p className={`text-[16px] leading-relaxed ${r?.status === "approved" ? "" : "border-l-4 border-saffron pl-4"}`}>{body}</p>
                        {step.sunnah.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {step.sunnah.map((id) => (
                              <Link key={id} href={`/app/sacred?tab=sunnah#${id}`} className="rounded-full bg-haram-tint px-3 py-1 text-[13px] font-semibold text-haram-deep">
                                {t("practices")}: {SUNNAH.find((s) => s.id === id)!.text[locale].split(/[।.:]/)[0]}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                        {step.items.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold text-ink-3">{t("related")}</span>
                            <div className="flex flex-col gap-2">
                              {step.items.map((id) => {
                                const item = getItem(id);
                                return (
                                  <details key={id} className="group rounded-md border border-line bg-field open:bg-paper">
                                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-tint text-saffron-ink transition-transform group-open:rotate-90">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                          <path d="M9 6l6 6-6 6" />
                                        </svg>
                                      </span>
                                      <span className="flex min-w-0 flex-1 flex-col">
                                        <b className="font-semibold">{item.title[locale]}</b>
                                        <span className="text-[13px] text-ink-3">{item.citation[locale]}</span>
                                      </span>
                                    </summary>
                                    <div className="px-3 pb-3">
                                      <ItemCard item={item} review={review(`item:${id}`)} locale={locale} canReview={false} compact />
                                    </div>
                                  </details>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        {canReview ? (
                          <div className="border-t border-dashed border-line pt-3">
                            <ReviewControls
                              contentId={`step:${step.id}`}
                              status={r?.status}
                              meaningBn={[r?.meaningBn[0] || step.body.bn]}
                              meaningEn={[r?.meaningEn[0] || step.body.en]}
                            />
                          </div>
                        ) : null}
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : tab === "sunnah" ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-md bg-saffron-tint px-5 py-4 text-[15px] text-saffron-ink">{t("sunnahNote")}</p>
          <ol className="grid gap-4 md:grid-cols-2">
            {SUNNAH.map((s, i) => {
              const r = review(`sunnah:${s.id}`);
              const text = r?.status === "approved" && (locale === "bn" ? r.meaningBn[0] : r.meaningEn[0]) ? (locale === "bn" ? r.meaningBn[0] : r.meaningEn[0]) : s.text[locale];
              return (
                <li key={s.id} id={s.id} className="scroll-mt-24">
                  <Card className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[20px_20px_8px_8px] bg-haram-tint font-display text-xl text-haram-deep">
                        {digits(i + 1, locale)}
                      </span>
                      <ReviewBadge review={r} t={t} />
                    </div>
                    <p className="flex-1 text-[16px] leading-relaxed">{text}</p>
                    <p className="text-[13px] font-semibold text-ink-3">{s.source[locale]}</p>
                    {canReview ? (
                      <ReviewControls contentId={`sunnah:${s.id}`} status={r?.status} meaningBn={[r?.meaningBn[0] || s.text.bn]} meaningEn={[r?.meaningEn[0] || s.text.en]} />
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {ITEMS.filter((i) => KIND_FOR_TAB[tab]!.includes(i.kind)).map((i) => (
            <ItemCard key={i.id} item={getItem(i.id)} review={review(`item:${i.id}`)} locale={locale} canReview={canReview} />
          ))}
        </div>
      )}
    </PageBody>
  );
}
