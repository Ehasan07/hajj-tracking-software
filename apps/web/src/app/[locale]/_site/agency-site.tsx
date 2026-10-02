import { getTranslations } from "next-intl/server";
import { getItem, STEPS, type ResolvedItem } from "@hajj/sacred";
import {
  ArrowIcon,
  BookIcon,
  CheckIcon,
  KaabaIcon,
  PhoneIcon,
  ReceiptIcon,
  StatementIcon,
} from "@/components/icons";
import { LabbaikOrnament, QuranAttribution, ReadingLines, StarDivider, Verses } from "@/components/sacred";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, money, phoneText, type Locale } from "@/lib/format";
import type { loadSite } from "@/server/site";
import { InquiryForm } from "./inquiry-form";
import { KaabaScene } from "./kaaba-scene";

type Site = Awaited<ReturnType<typeof loadSite>>;

const SITE_DUAS = ["dua_talbiyah", "dua_travel", "dua_rukn_yamani", "dua_arafah"];

/**
 * What to show under the Arabic: the scholar's approved wording, or, when the
 * agency allows it, the draft, flagged as such. Otherwise nothing.
 */
function reading(site: Site, item: ResolvedItem, locale: Locale) {
  const r = site.approved.get(`item:${item.id}`);
  if (!r && !site.settings?.showDraftMeanings) return null;
  const rewritten = r ? (locale === "bn" ? r.meaningBn : r.meaningEn) : [];
  return {
    draft: !r,
    meanings: item.verses.map((v, i) => (rewritten.length ? rewritten[i]! : v.meaning[locale])),
    pronunciation: r?.pronunciation ?? item.pronunciation ?? null,
  };
}

function DraftChip({ label, tone = "light" }: { label: string; tone?: "light" | "dark" }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
        tone === "dark" ? "bg-[#14635d] text-saffron" : "bg-saffron-tint text-saffron-ink"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
      {label}
    </span>
  );
}

export async function AgencySite({
  site,
  locale,
  selectedPackage,
}: {
  site: Site;
  locale: Locale;
  selectedPackage?: string;
}) {
  const t = await getTranslations("site");
  const tc = await getTranslations("common");
  const ti = await getTranslations("interest");
  const agency = site.settings!;
  const house = getItem("ayah_first_house");
  const houseReading = reading(site, house, locale);
  const labels = { pronunciation: t("pronunciation"), meaning: t("meaning") };
  const duas = SITE_DUAS.map(getItem);
  const featuredIndex = site.packages.length >= 3 ? 1 : -1;

  return (
    <div className="relative overflow-x-clip">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[20px_20px_8px_8px] bg-haram">
              <Khatam className="h-6 w-6 text-saffron" strokeWidth={7} />
            </span>
            <span className="truncate text-lg font-bold">{agency.legalName}</span>
          </a>
          <nav aria-label={t("nav.contact")} className="hidden items-center gap-1 text-[15px] lg:flex">
            {[
              ["#packages", t("nav.packages")],
              ["#steps", t("nav.steps")],
              ["#duas", t("nav.duas")],
              ["#contact", t("nav.contact")],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3.5 py-2.5 hover:bg-haram-tint">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" locale={locale === "bn" ? "en" : "bn"} className="rounded-md px-3 py-2.5 text-[15px] font-semibold text-ink-2 hover:bg-ground">
              {locale === "bn" ? "EN" : "বাংলা"}
            </Link>
            <Link href="/sign-in" className={buttonClass("primary", "h-11 px-4 text-[15px]")}>
              {t("nav.staff")}
            </Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-12 pb-20 sm:px-8 lg:grid-cols-12 lg:pt-16">
        <LabbaikOrnament className="pointer-events-none absolute -top-8 -left-24 text-[300px] text-haram-tint/70" />
        <div className="relative flex flex-col gap-6 lg:col-span-7">
          <span className="inline-flex h-9 w-fit animate-rise items-center gap-2 rounded-full bg-saffron-tint px-4 text-sm font-bold text-saffron-ink">
            <span className="h-2 w-2 animate-ripple rounded-full bg-saffron" />
            {t("badge")}
          </span>
          <h1 className="animate-rise font-display text-[44px] leading-[1.12] [animation-delay:80ms] sm:text-6xl lg:text-[68px]">
            {t("hero.title1")} {t("hero.title2")}{" "}
            <span className="relative inline-block text-haram">
              {t("hero.title3")}
              <svg viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-2 left-0 h-4 w-full">
                <path
                  d="M3 12 C 50 3, 100 16, 197 7"
                  fill="none"
                  stroke="var(--color-saffron)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="[stroke-dasharray:220] [stroke-dashoffset:220] animate-[draw_0.9s_0.9s_ease-out_forwards]"
                />
              </svg>
            </span>{" "}
            {t("hero.title4")}
          </h1>
          <p className="max-w-xl animate-rise text-lg leading-relaxed text-ink-2 [animation-delay:160ms]">{t("hero.body")}</p>
          <div className="flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
            <a href="#packages" className={buttonClass("primary", "h-14 px-7 text-lg")}>
              {t("hero.packages")}
              <ArrowIcon size={20} />
            </a>
            {agency.phone ? (
              <a href={`tel:${agency.phone}`} className={buttonClass("outline", "h-14 border-line-strong px-6 text-lg")}>
                <PhoneIcon size={20} className="text-haram" />
                {phoneText(agency.phone, locale)}
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative flex justify-center lg:col-span-5">
          <div className="relative aspect-[4/5] w-full max-w-[400px] animate-[reveal_1.1s_0.15s_cubic-bezier(.6,0,.2,1)_both] overflow-hidden rounded-[200px_200px_28px_28px] border-[10px] border-paper shadow-[0_40px_80px_-40px_rgb(18_48_46/0.6)]">
            <KaabaScene label={t("hero.art")} />
          </div>
          <div className="absolute bottom-10 -left-2 flex animate-[float_5s_ease-in-out_infinite] items-center gap-3 rounded-lg bg-paper px-4 py-3.5 shadow-[0_18px_40px_-20px_rgb(18_48_46/0.5)] sm:-left-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paid-tint text-paid">
              <CheckIcon size={22} />
            </span>
            <span className="flex flex-col">
              <b className="text-[15px]">{t("hero.toast")}</b>
              <span className="text-[13px] text-ink-3">{t("hero.toastBody")}</span>
            </span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section className="bg-haram-night text-ground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            agency.licenseNumber
              ? { icon: KaabaIcon, title: t("features.licence"), body: t("features.licenceBody", { number: agency.licenseNumber }) }
              : null,
            { icon: ReceiptIcon, title: t("features.receipt"), body: t("features.receiptBody") },
            { icon: BookIcon, title: t("features.guide"), body: t("features.guideBody") },
            { icon: StatementIcon, title: t("features.ledger"), body: t("features.ledgerBody") },
          ]
            .filter((f): f is NonNullable<typeof f> => f !== null)
            .map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[24px_24px_10px_10px] bg-[#14635d] text-ground">
                  <Icon size={26} tint="transparent" accent="var(--color-saffron)" />
                </span>
                <span className="flex flex-col gap-1">
                  <b className="text-[17px]">{title}</b>
                  <span className="text-[15px] leading-relaxed text-[#a9cfc9]">{body}</span>
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- packages */}
      <section id="packages" className="mx-auto flex max-w-7xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-hand text-2xl text-saffron-deep">{t("packages.eyebrow")}</span>
          <h2 className="font-display text-4xl sm:text-5xl">{t("packages.title")}</h2>
        </div>
        {site.packages.length === 0 ? (
          <p className="text-center text-ink-3">{t("packages.empty")}</p>
        ) : (
          <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
            {site.packages.map((p, i) => {
              const featured = i === featuredIndex;
              return (
                <article
                  key={p.id}
                  className={`lift relative flex flex-col items-center gap-4 overflow-hidden rounded-[150px_150px_24px_24px] px-7 pt-14 pb-7 text-center ${
                    featured ? "bg-haram-night text-ground" : "bg-paper"
                  }`}
                >
                  {featured ? (
                    <span className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-saffron px-4 py-1 text-[13px] font-extrabold text-ink">
                      {t("packages.popular")}
                    </span>
                  ) : null}
                  <span className={`mt-3 flex h-16 w-16 items-center justify-center rounded-full ${featured ? "bg-[#14635d]" : "bg-haram-tint"}`}>
                    <KaabaIcon size={34} tint={featured ? "transparent" : "var(--color-paper)"} className={featured ? "text-ground" : ""} />
                  </span>
                  <span className={`text-[13px] font-semibold ${featured ? "text-[#a9cfc9]" : "text-ink-3"}`}>
                    {ti(p.kind)} · {digits(p.season, locale)}
                  </span>
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <p className={`tabular text-3xl font-bold ${featured ? "text-saffron" : "text-haram"}`}>{money(p.price, locale, p.currency)}</p>
                  {p.days ? (
                    <span className={`text-[15px] ${featured ? "text-[#c7ddd9]" : "text-ink-2"}`}>
                      {t("packages.days", { days: digits(p.days, locale) })}
                    </span>
                  ) : null}
                  {p.notes ? (
                    <p className={`w-full border-t border-dashed pt-4 text-[15px] leading-relaxed ${featured ? "border-[#2a6a64] text-[#c7ddd9]" : "border-line-strong text-ink-2"}`}>
                      {p.notes}
                    </p>
                  ) : null}
                  <a
                    href={`?package=${p.id}#inquiry`}
                    className={featured ? buttonClass("saffron", "mt-auto w-full") : buttonClass("outline", "mt-auto w-full")}
                  >
                    {t("packages.interested")}
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------- ayah */}
      <section className="relative overflow-hidden bg-paper">
        <Khatam className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] animate-turn text-[#eef3f2]" strokeWidth={0.6} />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-8">
          <span className="font-hand text-2xl text-saffron-deep">{t("ayah.eyebrow")}</span>
          <StarDivider className="w-full max-w-md text-saffron" />
          <Verses item={house} className="text-center text-[28px] sm:text-[36px]" />
          {houseReading ? (
            <div className="flex w-full max-w-3xl flex-col gap-4 rounded-[28px_28px_16px_16px] bg-ground px-6 py-6 sm:px-8">
              {houseReading.draft ? <DraftChip label={t("draftChip")} /> : null}
              <ReadingLines item={house} pronunciation={houseReading.pronunciation} meanings={houseReading.meanings} locale={locale} labels={labels} />
            </div>
          ) : null}
          <span className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-3">
            {house.citation[locale]} · <QuranAttribution locale={locale} />
          </span>
        </div>
      </section>

      {/* ------------------------------------------------------------- steps */}
      <section id="steps" className="mx-auto flex max-w-7xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-hand text-2xl text-saffron-deep">{t("steps.eyebrow")}</span>
          <h2 className="font-display text-4xl sm:text-5xl">{t("steps.title")}</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {(["umrah", "hajj"] as const).map((phase) => (
            <div key={phase} className="flex flex-col gap-5 rounded-[60px_60px_24px_24px] bg-paper px-6 pt-10 pb-8 sm:px-10">
              <h3 className="text-center font-display text-3xl text-haram">{t(`steps.${phase}`)}</h3>
              {agency.showDraftMeanings && STEPS.some((st) => st.phase === phase && !site.approved.has(`step:${st.id}`)) ? (
                <div className="flex justify-center">
                  <DraftChip label={t("draftChip")} />
                </div>
              ) : null}
              <ol className="flex flex-col">
                {STEPS.filter((s) => s.phase === phase).map((step, i, list) => {
                  const r = site.approved.get(`step:${step.id}`);
                  const body = r
                    ? (locale === "bn" ? r.meaningBn[0] : r.meaningEn[0]) || step.body[locale]
                    : agency.showDraftMeanings
                      ? step.body[locale]
                      : null;
                  return (
                    <li key={step.id} className="relative flex gap-4 pb-6">
                      {i < list.length - 1 ? <span className="absolute top-11 bottom-0 left-[21px] w-0.5 bg-line" aria-hidden="true" /> : null}
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-haram-tint font-display text-lg text-haram-deep">
                        {digits(i + 1, locale)}
                      </span>
                      <span className="flex flex-col gap-1 pt-1.5">
                        <span className="text-[13px] font-semibold text-saffron-deep">{step.label[locale]}</span>
                        <b className="text-lg">{step.title[locale]}</b>
                        {body ? <span className="text-[15px] leading-relaxed text-ink-2">{body}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        <p className="text-center font-hand text-xl text-ink-3">{t("steps.more")}</p>
      </section>

      {/* -------------------------------------------------------------- duas */}
      <section id="duas" className="scroll-mt-20 bg-haram-night text-ground">
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 overflow-hidden px-4 py-20 sm:px-8">
          <LabbaikOrnament className="pointer-events-none absolute -right-10 bottom-0 text-[260px] text-[#14635d]" />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <span className="font-hand text-2xl text-saffron">{t("duas.eyebrow")}</span>
            <h2 className="font-display text-4xl sm:text-5xl">{t("duas.title")}</h2>
          </div>
          <div className="relative grid gap-6 md:grid-cols-2">
            {duas.map((dua) => {
              const shown = reading(site, dua, locale);
              return (
                <article key={dua.id} className="flex flex-col gap-4 rounded-[40px_40px_20px_20px] bg-[#0e5a54] p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold">{dua.title[locale]}</h3>
                    <span className="text-[13px] text-[#a9cfc9]">{dua.citation[locale]}</span>
                  </div>
                  <p lang="ar" dir="rtl" className="font-naskh text-[26px] leading-[2] text-ground">
                    {dua.verses[0]!.arabic}
                  </p>
                  {shown ? (
                    <div className="flex flex-col gap-3 border-t border-[#2a6a64] pt-4">
                      {shown.draft ? <DraftChip label={t("draftChip")} tone="dark" /> : null}
                      <ReadingLines item={dua} pronunciation={shown.pronunciation} meanings={shown.meanings} locale={locale} tone="dark" labels={labels} />
                      {dua.when ? <p className="text-[14px] leading-relaxed text-[#a9cfc9]">{dua.when[locale]}</p> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- inquiry & contact */}
      <section id="inquiry" className="mx-auto grid max-w-7xl scroll-mt-20 gap-8 px-4 py-20 sm:px-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 rounded-[60px_60px_24px_24px] bg-paper px-6 pt-12 pb-8 sm:px-10 lg:col-span-7">
          <div className="flex flex-col gap-2">
            <span className="font-hand text-2xl text-saffron-deep">{t("inquiry.eyebrow")}</span>
            <h2 className="font-display text-4xl">{t("inquiry.title")}</h2>
            <p className="text-[16px] leading-relaxed text-ink-2">{t("inquiry.body")}</p>
          </div>
          <InquiryForm packages={site.packages.map((p) => ({ id: p.id, name: p.name }))} selectedPackage={selectedPackage} />
        </div>

        <aside id="contact" className="flex scroll-mt-20 flex-col gap-6 lg:col-span-5">
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-[60px_60px_24px_24px] bg-haram-night px-8 pt-12 pb-8 text-ground">
            <Khatam className="absolute -right-16 -bottom-16 h-56 w-56 text-[#14635d]" strokeWidth={1} />
            <h2 className="relative font-display text-3xl">{t("contact.title")}</h2>
            <dl className="relative flex flex-col gap-4 text-[16px]">
              {agency.address ? (
                <div>
                  <dt className="text-[13px] text-[#a9cfc9]">{t("contact.address")}</dt>
                  <dd className="leading-relaxed">{agency.address}</dd>
                </div>
              ) : null}
              {agency.phone ? (
                <div>
                  <dt className="text-[13px] text-[#a9cfc9]">{t("contact.phone")}</dt>
                  <dd>
                    <a href={`tel:${agency.phone}`} className="text-xl font-semibold text-saffron">
                      {phoneText(agency.phone, locale)}
                    </a>
                  </dd>
                </div>
              ) : null}
              {agency.email ? (
                <div>
                  <dt className="text-[13px] text-[#a9cfc9]">{t("contact.email")}</dt>
                  <dd>
                    <a href={`mailto:${agency.email}`} className="underline underline-offset-4">
                      {agency.email}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-saffron-tint px-6 py-5 text-saffron-ink">
            <ReceiptIcon size={34} tint="var(--color-paper)" accent="var(--color-haram)" />
            <p className="text-[15px] font-semibold leading-relaxed">{t("footer.verify")}</p>
          </div>
        </aside>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8">
          <StarDivider className="text-saffron" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-[14px] text-ink-3">
            <span className="flex items-center gap-2">
              <Khatam className="h-5 w-5 text-haram" strokeWidth={7} />
              <b className="text-ink">{agency.legalName}</b>
              {agency.licenseNumber ? <span>· {agency.licenseNumber}</span> : null}
            </span>
            <span className="flex flex-wrap items-center gap-3">
              <QuranAttribution locale={locale} />
              <span>
                © {digits(new Date().getFullYear(), locale)} · {t("footer.rights")}
              </span>
              <Link href="/sign-in" className="underline underline-offset-4">
                {tc("signIn")}
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
