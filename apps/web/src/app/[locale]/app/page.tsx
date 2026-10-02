import { getTranslations, setRequestLocale } from "next-intl/server";
import type { BusinessUnit } from "@hajj/core";
import { itemOfTheDay } from "@hajj/sacred";
import { CountUp } from "@/components/count-up";
import { DraftChip, QuranAttribution, ReadingLines, StarDivider, Verses } from "@/components/sacred";
import {
  DallahIcon,
  KaabaIcon,
  MedicineIcon,
  PlusIcon,
  SearchIcon,
  SupernovaIcon,
  ZamzamIcon,
} from "@/components/icons";
import { PageBody } from "@/components/page-header";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, initials, money, timeText, todayLine, type Locale } from "@/lib/format";
import { presented, type Review } from "@/lib/sacred";
import { getSession } from "@/server/session";
import { api } from "@/trpc/server";

const METHOD_COLOR: Record<string, string> = {
  cash: "var(--color-saffron)",
  bkash: "#e2136e",
  nagad: "#f6921e",
  rocket: "#8c3494",
  bank: "#a9cfc9",
  card: "#7fb2ee",
  other: "#c9d6d3",
};

const UNIT_TILES: { unit: BusinessUnit; icon: typeof KaabaIcon; color: string; tint: string }[] = [
  { unit: "zamzam", icon: ZamzamIcon, color: "var(--color-unit-zamzam)", tint: "var(--color-unit-zamzam-tint)" },
  { unit: "medicine", icon: MedicineIcon, color: "var(--color-unit-medicine)", tint: "var(--color-unit-medicine-tint)" },
  { unit: "coffee", icon: DallahIcon, color: "var(--color-unit-coffee)", tint: "var(--color-unit-coffee-tint)" },
  { unit: "supernova", icon: SupernovaIcon, color: "var(--color-unit-supernova)", tint: "var(--color-unit-supernova-tint)" },
];

export default async function Dashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const caller = await api();
  const [settings, today, recent, statusCounts, inquiryCounts, reviews] = await Promise.all([
    caller.tenant.settings(),
    caller.payments.today(),
    caller.payments.recent({ limit: 6 }),
    caller.pilgrims.statusCounts(),
    caller.inquiries.counts(),
    caller.sacred.reviews(),
  ]);
  // Prefer content the agency's scholar has approved; until then show the Arabic with the meaning held back.
  const approvedIds = new Set(
    Object.entries(reviews)
      .filter(([id, r]) => id.startsWith("item:") && r.status === "approved")
      .map(([id]) => id.slice(5)),
  );
  const daily = itemOfTheDay(today.day, approvedIds.size > 0 ? approvedIds : undefined);
  const dailyShown = daily ? presented(daily, reviews[`item:${daily.id}`] as Review | undefined, locale) : null;
  const totalPilgrims = statusCounts.reduce((a, s) => a + s.n, 0);
  const openInquiries = (inquiryCounts.new ?? 0) + (inquiryCounts.follow_up ?? 0);
  const methods = Object.entries(today.byMethod).filter(([, v]) => (v ?? 0) > 0) as [string, number][];
  const firstName = session?.user.name.split(" ")[0] ?? "";
  const units = UNIT_TILES.filter((u) => settings?.enabledUnits.includes(u.unit));

  return (
    <PageBody>
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] text-ink-3">{todayLine(locale)}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("dashboard.greeting", { name: firstName })}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/inquiries" className={buttonClass("outline")}>
            {t("dashboard.newInquiry")}
          </Link>
          <Link href="/app/pilgrims" className={buttonClass("primary")}>
            <PlusIcon size={18} />
            {t("dashboard.receive")}
          </Link>
        </div>
      </div>

      <form action={`/${locale === "bn" ? "" : "en/"}app/pilgrims`.replace("//", "/")} className="animate-rise [animation-delay:50ms]">
        <label className="flex h-[62px] items-center gap-3.5 rounded-lg border-[1.5px] border-line-strong bg-paper px-5 focus-within:border-haram focus-within:shadow-[0_0_0_4px_var(--color-haram-tint)]">
          <SearchIcon size={24} className="text-haram" />
          <input
            name="q"
            aria-label={t("common.search")}
            placeholder={t("dashboard.search")}
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-3/70"
          />
        </label>
      </form>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[120px_120px_22px_22px] bg-haram-night px-8 pt-16 pb-7 text-ground [animation-delay:100ms] lg:col-span-5">
          <Khatam className="absolute top-[-120px] left-1/2 h-[300px] w-[300px] -translate-x-1/2 animate-turn text-[#14635d]" strokeWidth={0.8} />
          <p className="relative text-center text-[15px] text-[#a9cfc9]">{t("dashboard.todayCollection")}</p>
          <p className="relative text-center text-5xl leading-none font-bold tracking-tight sm:text-[56px]">
            <CountUp value={today.total} locale={locale} />
          </p>
          <p className="relative text-center text-sm text-[#a9cfc9]">
            {t("dashboard.receiptsToday", { count: digits(today.count, locale) })}
          </p>
          {methods.length > 0 ? (
            <>
              <div className="relative mt-1 flex h-2.5 gap-1">
                {methods.map(([method, amount], i) => (
                  <span
                    key={method}
                    className="h-full origin-left animate-grow rounded-full"
                    style={{ flexGrow: amount, background: METHOD_COLOR[method], animationDelay: `${500 + i * 150}ms` }}
                  />
                ))}
              </div>
              <div className="relative grid grid-cols-3 gap-2">
                {methods.slice(0, 3).map(([method, amount]) => (
                  <div key={method} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-[#a9cfc9]">
                      <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLOR[method] }} />
                      {t(`methods.${method}`)}
                    </span>
                    <span className="tabular text-lg font-semibold">{money(amount, locale)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="grid gap-3.5 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
          <Link
            href="/app/pilgrims"
            className="lift flex animate-rise flex-col gap-2 rounded-[60px_60px_18px_18px] border-t-4 border-unit-hajj bg-paper px-5 pt-6 pb-5 [animation-delay:150ms]"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-haram-tint">
              <KaabaIcon size={30} tint="var(--color-paper)" />
            </span>
            <span className="text-[15px] font-semibold">{t("units.hajj")}</span>
            <span className="tabular text-2xl font-bold">{digits(totalPilgrims, locale)}</span>
            <span className="text-[13px] text-ink-3">{t("dashboard.pilgrimsRegistered", { count: digits(totalPilgrims, locale) })}</span>
          </Link>
          <Link
            href="/app/inquiries"
            className="lift flex animate-rise flex-col gap-2 rounded-[60px_60px_18px_18px] border-t-4 border-saffron bg-paper px-5 pt-6 pb-5 [animation-delay:200ms]"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-saffron-tint">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" fill="var(--color-paper)" />
                <path d="M10 7.6a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.4" stroke="var(--color-saffron-deep)" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold">{t("nav.inquiries")}</span>
            <span className="tabular text-2xl font-bold">{digits(openInquiries, locale)}</span>
            <span className="text-[13px] text-ink-3">{t("dashboard.openInquiries", { count: digits(openInquiries, locale) })}</span>
          </Link>
          {units.map(({ unit, icon: Icon, color, tint }, i) => (
            <div
              key={unit}
              className="flex animate-rise flex-col gap-2 rounded-[60px_60px_18px_18px] border-t-4 bg-paper px-5 pt-6 pb-5 opacity-80"
              style={{ borderColor: color, animationDelay: `${250 + i * 50}ms` }}
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full" style={{ background: tint }}>
                <Icon size={30} tint="var(--color-paper)" />
              </span>
              <span className="text-[15px] font-semibold">{t(`units.${unit}`)}</span>
              <span className="text-[13px] text-ink-3">{t("common.comingSoon")}</span>
            </div>
          ))}
        </section>
      </div>

      {daily && dailyShown ? (
        <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[120px_120px_22px_22px] bg-paper px-6 pt-10 pb-6 [animation-delay:280ms] sm:px-12">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="font-hand text-xl text-saffron-deep">
              {daily.kind === "dua" ? t("sacred.dayDua") : daily.kind === "hadith" ? t("sacred.dayHadith") : t("sacred.dayVerse")}
            </span>
            <span className="text-sm text-ink-3">
              {daily.title[locale]} · {daily.citation[locale]}
            </span>
          </div>
          <StarDivider />
          <Verses item={daily} className="text-center text-[26px] sm:text-[30px]" />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[24px_24px_14px_14px] bg-ground px-6 py-5">
            {!dailyShown.approved ? (
              <span className="flex flex-wrap items-center gap-2">
                <DraftChip label={t("site.draftChip")} />
                <Link
                  href={`/app/sacred?tab=${daily.kind === "dua" ? "duas" : daily.kind === "hadith" ? "hadith" : "ayat"}#${daily.id}`}
                  className="text-[13px] font-semibold text-haram underline underline-offset-4"
                >
                  {t("sacred.reviewLink")}
                </Link>
              </span>
            ) : null}
            <ReadingLines
              item={daily}
              pronunciation={dailyShown.pronunciation}
              meanings={dailyShown.meanings}
              locale={locale}
              labels={{ pronunciation: t("site.pronunciation"), meaning: t("site.meaning") }}
            />
          </div>
          {daily.verses[0]!.surah > 0 ? (
            <div className="flex justify-center">
              <QuranAttribution locale={locale} />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="animate-rise overflow-hidden rounded-lg bg-paper [animation-delay:300ms]">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold">{t("dashboard.recentReceipts")}</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 pb-8 text-ink-3">{t("dashboard.noReceipts")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[15px]">
              <thead className="bg-field text-left text-[13px] text-ink-3">
                <tr>
                  <th className="px-6 py-2.5 font-normal">{t("dashboard.receiptNo")}</th>
                  <th className="px-3 py-2.5 font-normal">{t("dashboard.pilgrim")}</th>
                  <th className="px-3 py-2.5 font-normal">{t("dashboard.method")}</th>
                  <th className="px-3 py-2.5 text-right font-normal">{t("dashboard.amount")}</th>
                  <th className="px-6 py-2.5 text-right font-normal">{t("dashboard.time")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[#eef3f2] ${i === 0 ? "animate-flash [animation-delay:900ms]" : ""} ${r.voidedAt ? "text-ink-3 line-through" : ""}`}
                  >
                    <td className="px-6 py-3.5">
                      <Link href={`/app/receipts/${r.id}`} className="font-mono text-[13px] text-haram hover:underline">
                        {r.receiptNo}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/app/pilgrims/${r.pilgrimId}`} className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-haram-tint text-sm font-bold text-haram-deep">
                          {initials(r.pilgrimName)}
                        </span>
                        <span className="flex flex-col">
                          <b className="font-semibold">{r.pilgrimName}</b>
                          <span className="font-mono text-xs text-ink-3">{r.pilgrimRef}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLOR[r.method] }} />
                        {t(`methods.${r.method}`)}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right font-bold">{money(r.amount, locale, r.currency)}</td>
                    <td className="px-6 py-3.5 text-right text-[13px] text-ink-3">{timeText(r.receivedAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageBody>
  );
}
