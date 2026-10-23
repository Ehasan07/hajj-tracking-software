import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import {
  AYAH_END,
  arabicNumber,
  BASMALAH,
  BOOK,
  getItem,
  needsRecording,
  PRAYER_PART_NAMES,
  QURAN_ATTRIBUTION,
  STEPS,
  SUNNAH,
  type BookBlock,
  type ResolvedItem,
  type Text,
} from "@hajj/sacred";
import { PrintButton } from "@/components/print-button";
import { ArabicText, LabbaikOrnament, StarDivider } from "@/components/sacred";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import { BookControls } from "./book-controls";
import { Recitation } from "./recitation";
import { BrandMark } from "@/components/brand-mark";
import { InstallApp } from "@/components/pwa";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "book" });
  return { title: { absolute: t("title") }, description: t("subtitle") };
}

/** Visibility hooks for the reading settings (see book-controls.tsx). */
const show = {
  ar: "group-data-[ar=off]/book:hidden",
  pr: "group-data-[pr=off]/book:hidden",
  bn: "group-data-[bn=off]/book:hidden",
  en: "group-data-[en=off]/book:hidden",
};
const body = "text-[length:var(--book-body)] leading-relaxed";
const arabicSize = "text-[length:var(--book-ar)] leading-[2.1]";

const pick = (text: Text, locale: Locale) => text[locale];
const searchText = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(" ").toLowerCase();

function Meanings({ bn, en, locale }: { bn: string; en: string; locale: Locale }) {
  const rows = [
    { lang: "bn" as const, text: bn, cls: show.bn },
    { lang: "en" as const, text: en, cls: show.en },
  ];
  if (locale === "en") rows.reverse();
  return (
    <>
      {rows.map((r) =>
        r.text ? (
          <p key={r.lang} lang={r.lang} className={`${r.cls} ${body} ${r.lang === "en" ? "text-ink-2" : "text-ink"}`}>
            {r.text}
          </p>
        ) : null,
      )}
    </>
  );
}

/** "112-1": an ayah as the recitation route names it. */
const reciteRef = (ref: string) => ref.replace(":", "-");

/**
 * A play button for the recitation player (recitation.tsx), which listens for
 * clicks on anything with data-recite. Shows a pause sign while it plays.
 */
function ReciteButton({
  refs,
  item,
  title,
  label,
  wide = false,
  recording = false,
}: {
  refs: string;
  item: string;
  title: string;
  label: string;
  wide?: boolean;
  /** A qari's uploaded recording: hidden until the player learns there is one (recitation.tsx). */
  recording?: boolean;
}) {
  return (
    <button
      type="button"
      {...(recording ? { "data-recording": item, hidden: true } : { "data-recite": refs, "data-recite-item": item })}
      data-recite-title={title}
      aria-label={label}
      title={label}
      className={`group/recite inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-[1.5px] border-haram/40 text-haram-deep transition-colors hover:bg-haram-tint data-[playing]:border-haram data-[playing]:bg-haram data-[playing]:text-white print:hidden ${wide ? "h-10 px-4 text-[14px] font-semibold" : "h-9 w-9"}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="group-data-[playing]/recite:hidden">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="hidden group-data-[playing]/recite:block">
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
      </svg>
      {wide ? <span>{label}</span> : null}
    </button>
  );
}

/** One surah, ayah or dua: Arabic, Bangla pronunciation, Bangla and English meaning, when it is said, and its source. */
async function ItemCard({ item, locale, compact = false }: { item: ResolvedItem; locale: Locale; compact?: boolean }) {
  const t = await getTranslations("book");
  const quran = item.verses[0]!.surah > 0;
  const lines = (item.pronunciation ?? "").split("\n");
  const perAyah = quran && item.verses.length > 1;
  // Whole ayat can be heard; words cut from an ayah (the kalimah) can't.
  const recitable = quran && item.verses.every((v) => !v.part);
  const title = pick(item.title, locale);
  const allRefs = [...(item.basmalah ? ["1-1"] : []), ...item.verses.map((v) => reciteRef(v.ref))].join(",");
  const tapToPlay = "cursor-pointer rounded-lg transition-colors hover:bg-haram-tint/40";
  // Duas, hadith and the kalimah play a qari's recording when one has been uploaded.
  const recorded = needsRecording(item.id);
  const recordingAttrs = recorded ? { "data-recording": item.id, "data-recite-title": title } : {};
  return (
    <article
      id={`item-${item.id}`}
      data-search={searchText(item.title.bn, item.title.en, item.pronunciation, ...item.verses.flatMap((v) => [v.meaning.bn, v.meaning.en]), item.when?.bn, item.when?.en)}
      className={`flex scroll-mt-28 flex-col gap-4 rounded-[24px] border border-line bg-paper ${compact ? "p-4 sm:p-5" : "p-5 sm:p-7"} print:break-inside-avoid`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h4 className="text-[19px] leading-snug font-bold">{pick(item.title, locale)}</h4>
        <span className="text-[13px] text-ink-3">{pick(item.citation, locale)}</span>
      </header>
      {recitable && perAyah ? (
        <ReciteButton refs={allRefs} item={item.id} title={title} wide label={item.kind === "surah" ? t("recite.listenSurah") : t("recite.listenAll")} />
      ) : null}
      {recorded && perAyah ? <ReciteButton refs="" item={item.id} title={title} wide recording label={t("recite.listen")} /> : null}
      {item.when ? (
        <p className={`rounded-xl bg-saffron-tint/70 px-4 py-2.5 text-[14px] leading-relaxed text-saffron-ink`}>
          <b>{t("when")}: </b>
          {pick(item.when, locale)}
        </p>
      ) : null}

      {item.basmalah ? (
        <div className="flex flex-col items-center gap-1 border-b border-dashed border-line pb-3 text-center">
          <ArabicText
            source="quran"
            className={`${show.ar} !text-center ${arabicSize} text-haram-deep ${tapToPlay}`}
            data-recite="1-1"
            data-recite-item={`${item.id}-basmalah`}
            data-recite-title={title}
          >
            {BASMALAH}
          </ArabicText>
          <span className={`${show.pr} text-[14px] text-ink-2`}>{t("basmalah")}</span>
        </div>
      ) : null}

      {perAyah ? (
        <ol className="flex flex-col divide-y divide-dashed divide-line">
          {item.verses.map((v, i) => (
            <li
              key={v.ref}
              data-verse={`${item.id}|${reciteRef(v.ref)}`}
              className="-mx-2 flex flex-col gap-2 rounded-xl px-2 py-3 transition-colors first:pt-0 last:pb-0 data-[playing]:bg-haram-tint/60 print:break-inside-avoid"
            >
              <div className="flex items-start gap-3">
                {recitable ? (
                  <span className="mt-2 print:hidden">
                    <ReciteButton refs={reciteRef(v.ref)} item={item.id} title={title} label={t("recite.listenAyah", { n: digits(v.ayah, locale) })} />
                  </span>
                ) : null}
                <ArabicText
                  source="quran"
                  className={`${show.ar} ${arabicSize} min-w-0 flex-1 ${recitable ? tapToPlay : ""}`}
                  {...(recitable ? { "data-recite": reciteRef(v.ref), "data-recite-item": item.id, "data-recite-title": title } : recordingAttrs)}
                >
                  {v.arabic}
                  {v.part ? null : (
                    <span className="mx-1 text-saffron-deep">
                      {" "}
                      {AYAH_END}
                      {arabicNumber(v.ayah)}
                    </span>
                  )}
                </ArabicText>
              </div>
              <p className={`${show.pr} ${body} font-semibold text-haram-deep`}>
                <span className="mr-2 inline-grid h-6 min-w-6 place-items-center rounded-full bg-haram-tint px-1.5 text-[12px] font-bold">
                  {v.part ? pick(v.part, locale) : digits(v.ayah, locale)}
                </span>
                {lines[i]}
              </p>
              <Meanings bn={v.meaning.bn} en={v.meaning.en} locale={locale} />
            </li>
          ))}
        </ol>
      ) : (
        <div
          className="-mx-2 flex flex-col gap-2.5 rounded-xl px-2 transition-colors data-[playing]:bg-haram-tint/60"
          {...(recitable ? { "data-verse": `${item.id}|${allRefs}` } : recorded ? { "data-verse": `${item.id}|rec:${item.id}` } : {})}
        >
          {recitable ? (
            <div className="flex items-center justify-end print:hidden">
              <ReciteButton refs={allRefs} item={item.id} title={title} wide label={t("recite.listen")} />
            </div>
          ) : recorded ? (
            <div className="flex items-center justify-end has-[[hidden]]:hidden print:hidden">
              <ReciteButton refs="" item={item.id} title={title} wide recording label={t("recite.listen")} />
            </div>
          ) : null}
          <ArabicText
            source={quran ? "quran" : "hadith"}
            className={`${show.ar} ${arabicSize} ${recitable ? tapToPlay : ""}`}
            {...(recitable ? { "data-recite": allRefs, "data-recite-item": item.id, "data-recite-title": title } : recordingAttrs)}
          >
            {item.verses.map((v) => (
              <span key={v.ref}>
                {v.arabic}
                {quran ? (
                  <span className="mx-1 text-saffron-deep">
                    {" "}
                    {AYAH_END}
                    {arabicNumber(v.ayah)}
                  </span>
                ) : null}
              </span>
            ))}
          </ArabicText>
          {item.pronunciation ? (
            <p className={`${show.pr} ${body} font-semibold text-haram-deep`}>
              <span className="sr-only">{t("pronunciation")}: </span>
              {item.pronunciation}
            </p>
          ) : null}
          <Meanings bn={item.verses[0]!.meaning.bn} en={item.verses[0]!.meaning.en} locale={locale} />
        </div>
      )}

      {item.note ? <p className="border-t border-line pt-3 text-[14px] leading-relaxed text-ink-2">{pick(item.note, locale)}</p> : null}
    </article>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>;
}

async function Block({ block, locale }: { block: BookBlock; locale: Locale }) {
  const t = await getTranslations("book");
  const heading = (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-display text-[26px] leading-snug sm:text-3xl">{pick(block.title, locale)}</h3>
      {"intro" in block && block.intro ? <p className={`${body} max-w-3xl text-ink-2`}>{pick(block.intro, locale)}</p> : null}
    </div>
  );

  if (block.kind === "items") {
    const items = block.items.map(getItem);
    return (
      <section id={block.id} data-group className="flex scroll-mt-28 flex-col gap-5">
        {heading}
        <Grid>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} locale={locale} />
          ))}
        </Grid>
      </section>
    );
  }

  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <section
        id={block.id}
        data-group
        data-search={searchText(block.title.bn, block.title.en, ...block.points.flatMap((p) => [p.bn, p.en]), block.note?.bn, block.note?.en)}
        className="flex scroll-mt-28 flex-col gap-4 rounded-[24px] bg-paper p-5 sm:p-7 print:break-inside-avoid"
      >
        {heading}
        <ListTag className="flex flex-col gap-3">
          {block.points.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-[12px_12px_5px_5px] text-[13px] font-bold ${block.ordered ? "bg-haram text-white" : "bg-haram-tint text-haram-deep"}`}
              >
                {block.ordered ? digits(i + 1, locale) : "•"}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`${body} ${locale === "bn" ? show.bn : show.en}`}>{pick(p, locale)}</span>
                <span className={`text-[14px] leading-relaxed text-ink-3 ${locale === "bn" ? show.en : show.bn}`}>{pick(p, locale === "bn" ? "en" : "bn")}</span>
              </span>
            </li>
          ))}
        </ListTag>
        {block.note ? <p className="rounded-xl bg-ground px-4 py-3 text-[14px] leading-relaxed text-ink-2">{pick(block.note, locale)}</p> : null}
      </section>
    );
  }

  if (block.kind === "rakat") {
    const tone = { fard: "bg-haram text-white", wajib: "bg-saffron text-ink", sunnah_muakkadah: "bg-paid-tint text-paid", sunnah: "bg-ground text-ink-2", nafl: "bg-ground text-ink-3" } as const;
    return (
      <section id={block.id} data-group data-search={searchText(block.title.bn, block.title.en, ...block.rows.flatMap((r) => [r.prayer.bn, r.prayer.en]))} className="flex scroll-mt-28 flex-col gap-4">
        {heading}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {block.rows.map((row) => (
            <div key={row.prayer.en} className="flex flex-col gap-3 rounded-[24px] bg-paper p-5 print:break-inside-avoid">
              <div className="flex flex-col">
                <b className="text-[20px]">{pick(row.prayer, locale)}</b>
                <span className="text-[13px] text-ink-3">{pick(row.time, locale)}</span>
              </div>
              <ol className="flex flex-wrap items-center gap-1.5" aria-label={t("order")}>
                {row.parts.map((part, i) => (
                  <li key={i} className={`flex items-baseline gap-1 rounded-full px-3 py-1.5 text-[14px] font-semibold ${tone[part.part]}`}>
                    <b className="text-[17px]">{digits(part.count, locale)}</b>
                    {pick(PRAYER_PART_NAMES[part.part], locale)}
                  </li>
                ))}
              </ol>
              <span className="text-[13px] text-ink-3">{t("total", { n: digits(row.parts.reduce((s, p) => s + p.count, 0), locale) })}</span>
            </div>
          ))}
        </div>
        {block.note ? <p className="rounded-xl bg-paper px-4 py-3 text-[14px] leading-relaxed text-ink-2">{pick(block.note, locale)}</p> : null}
      </section>
    );
  }

  if (block.kind === "sequence") {
    return (
      <section id={block.id} data-group className="flex scroll-mt-28 flex-col gap-5">
        {heading}
        <ol className="relative flex flex-col gap-6">
          {block.steps.map((step, i) => (
            <li key={i} data-group className="relative grid gap-4 sm:grid-cols-[48px_1fr]">
              <span aria-hidden="true" className="hidden h-12 w-11 items-center justify-center rounded-[22px_22px_8px_8px] bg-haram font-display text-lg text-white sm:flex">
                {digits(i + 1, locale)}
              </span>
              <div className="flex flex-col gap-3">
                <div data-search={searchText(step.title.bn, step.title.en, step.body.bn, step.body.en)} className="flex flex-col gap-1">
                  <h4 className="text-[20px] font-bold">
                    <span className="mr-2 text-haram sm:hidden">{digits(i + 1, locale)}.</span>
                    {pick(step.title, locale)}
                  </h4>
                  <p className={`${body} text-ink-2`}>{pick(step.body, locale)}</p>
                </div>
                {step.items.length ? (
                  <div className="flex flex-col gap-3">
                    {step.items.map((id) => (
                      <ItemCard key={id} item={getItem(id)} locale={locale} compact />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {block.note ? <p className="rounded-xl bg-paper px-4 py-3 text-[14px] leading-relaxed text-ink-2">{pick(block.note, locale)}</p> : null}
      </section>
    );
  }

  // journey: the Umrah or Hajj steps with what is done and said at each
  const steps = STEPS.filter((s) => s.phase === block.phase);
  const practices = new Map(SUNNAH.map((s) => [s.id, s]));
  return (
    <section id={block.id} data-group className="flex scroll-mt-28 flex-col gap-5">
      {heading}
      <ol className="flex flex-col gap-8">
        {steps.map((step) => (
          <li key={step.id} data-group className="flex flex-col gap-4 rounded-[28px] bg-haram-tint/40 p-4 sm:p-6">
            <div data-search={searchText(step.title.bn, step.title.en, step.body.bn, step.body.en)} className="flex flex-col gap-1.5">
              <span className="w-fit rounded-full bg-saffron px-3 py-0.5 text-[13px] font-bold text-ink">{pick(step.label, locale)}</span>
              <h4 className="font-display text-[24px] leading-snug">{pick(step.title, locale)}</h4>
              <p className={`${body} text-ink-2`}>{pick(step.body, locale)}</p>
            </div>
            {step.sunnah.length ? (
              <ul className="flex flex-col gap-2 rounded-2xl bg-paper p-4" aria-label={t("sunnah")}>
                <li className="text-[13px] font-bold text-paid">{t("sunnah")}</li>
                {step.sunnah.map((id) => {
                  const p = practices.get(id)!;
                  return (
                    <li key={id} data-search={searchText(p.text.bn, p.text.en)} className="flex flex-col gap-0.5 border-t border-line pt-2 text-[15px] leading-relaxed">
                      {pick(p.text, locale)}
                      <span className="text-[12px] text-ink-3">{pick(p.source, locale)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {step.items.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {step.items.map((id) => (
                  <ItemCard key={id} item={getItem(id)} locale={locale} compact />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function GuideBook({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("book");
  const tp = await getTranslations("privacy");

  return (
    <div
      id="book"
      className="group/book relative min-h-dvh overflow-x-clip"
      data-ar="on"
      data-pr="on"
      data-bn="on"
      data-en="on"
      style={{ "--book-body": "17px", "--book-ar": "28px" } as CSSProperties}
    >
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ground/90 backdrop-blur print:static">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <b className="whitespace-nowrap">{t("brand")}</b>
          </Link>
          <div className="flex items-center gap-2 print:hidden">
            <Link href="/guide" locale={locale === "bn" ? "en" : "bn"} className="rounded-md px-3 py-2 text-[15px] font-semibold text-ink-2 hover:bg-paper">
              {locale === "bn" ? "EN" : "বাংলা"}
            </Link>
            <PrintButton />
          </div>
        </div>
        <nav aria-label={t("contents")} className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-8 print:hidden">
          {BOOK.map((chapter, i) => (
            <a key={chapter.id} href={`#${chapter.id}`} className="shrink-0 rounded-full bg-paper px-3.5 py-1.5 text-[14px] font-semibold text-ink-2 hover:bg-haram-tint hover:text-haram-deep">
              {digits(i + 1, locale)}. {pick(chapter.title, locale)}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-10 pb-20 sm:px-8">
        <section className="relative flex flex-col gap-5">
          <LabbaikOrnament className="pointer-events-none absolute -top-6 -right-6 text-[200px] text-haram-tint/80 sm:text-[280px] print:hidden" />
          <h1 className="relative max-w-3xl font-display text-[40px] leading-[1.12] sm:text-6xl">{t("title")}</h1>
          <p className="relative max-w-2xl text-[18px] leading-relaxed text-ink-2">{t("subtitle")}</p>
          <div className="relative flex flex-col gap-2 rounded-[20px] border-l-[6px] border-l-saffron bg-paper px-5 py-4 text-[14px] leading-relaxed text-ink-2">
            <p>
              <b className="text-ink">{t("sources.arabicTitle")} </b>
              {t("sources.arabic")}
            </p>
            <p>
              <b className="text-ink">{t("sources.draftTitle")} </b>
              {t("sources.draft")}
            </p>
            <p>
              <b className="text-ink">{t("sources.fiqhTitle")} </b>
              {t("sources.fiqh")}
            </p>
          </div>
          <BookControls />
          <p className="-mt-2 px-1 text-[14px] text-ink-3 print:hidden">{t("recite.hint")}</p>
          <Recitation />
          <InstallApp className="relative print:hidden" />
        </section>

        <nav aria-label={t("contents")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {BOOK.map((chapter, i) => (
            <a key={chapter.id} href={`#${chapter.id}`} className="group flex gap-4 rounded-[24px] bg-paper p-5 transition-colors hover:bg-haram-tint/50">
              <span className="flex h-12 w-11 shrink-0 items-center justify-center rounded-[22px_22px_8px_8px] bg-haram font-display text-lg text-white">{digits(i + 1, locale)}</span>
              <span className="flex flex-col gap-1">
                <b className="text-[18px] group-hover:text-haram-deep">{pick(chapter.title, locale)}</b>
                <span className="text-[14px] leading-relaxed text-ink-3">{pick(chapter.summary, locale)}</span>
              </span>
            </a>
          ))}
        </nav>

        {BOOK.map((chapter, i) => (
          <section key={chapter.id} id={chapter.id} data-group className="flex scroll-mt-28 flex-col gap-10">
            <div className="flex flex-col gap-3 border-t-2 border-haram/20 pt-8">
              <span className="font-hand text-2xl text-saffron-deep">{t("chapter", { n: digits(i + 1, locale) })}</span>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">{pick(chapter.title, locale)}</h2>
              <p className={`${body} max-w-3xl text-ink-2`}>{pick(chapter.summary, locale)}</p>
            </div>
            {chapter.blocks.map((block) => (
              <Block key={block.id} block={block} locale={locale} />
            ))}
          </section>
        ))}

        <footer className="flex flex-col items-center gap-4 pt-6 text-center text-[13px] text-ink-3">
          <StarDivider className="w-full max-w-md text-saffron" />
          <p>
            {QURAN_ATTRIBUTION[locale]} · <a href={QURAN_ATTRIBUTION.url} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">tanzil.net</a>
          </p>
          <p>{t("sources.hadithCredit")}</p>
          <p className="print:hidden">{t("recite.credit")}</p>
          <Link href="/sign-up" className={buttonClass("outline", "mt-2 print:hidden")}>
            {t("forAgencies")}
          </Link>
          <Link href="/privacy" className="underline underline-offset-4 print:hidden">
            {tp("link")}
          </Link>
        </footer>
      </main>
    </div>
  );
}
