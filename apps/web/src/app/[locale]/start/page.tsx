import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { InstallApp } from "@/components/pwa";
import { dateText, digits, type Locale } from "@/lib/format";
import { hijriDate, nextArafah } from "@/lib/hijri";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pwa.home" });
  return { title: { absolute: t("title") } };
}

const TILES = [
  { id: "guide", href: "", tint: "bg-haram text-white", sub: "text-white/80" },
  { id: "quran", href: "#quran", tint: "bg-paper", sub: "text-ink-3" },
  { id: "kalima", href: "#kalima", tint: "bg-paper", sub: "text-ink-3" },
  { id: "salah", href: "#salah", tint: "bg-paper", sub: "text-ink-3" },
  { id: "umrah", href: "#umrah", tint: "bg-paper", sub: "text-ink-3" },
  { id: "hajj", href: "#hajj", tint: "bg-paper", sub: "text-ink-3" },
  { id: "daily", href: "#daily", tint: "bg-paper", sub: "text-ink-3" },
  { id: "madinah", href: "#madinah", tint: "bg-paper", sub: "text-ink-3" },
] as const;

/**
 * The installed app's first screen. The same for everyone (nothing personal
 * on it), so the phone can keep it for offline use: the guide book for any
 * reader, and the way into the agency software for staff.
 */
export default async function AppHome({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa.home");
  const tp = await getTranslations("privacy");
  const prefix = locale === "en" ? "/en" : "";
  const arafah = nextArafah();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 pt-6 pb-10">
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <BrandMark className="h-11 w-11" />
          <b className="text-lg">{t("brand")}</b>
        </span>
        <a href={locale === "en" ? "/start" : "/en/start"} className="rounded-md px-3 py-2 text-[15px] font-semibold text-ink-2 hover:bg-paper">
          {locale === "en" ? "বাংলা" : "EN"}
        </a>
      </header>

      {arafah ? (
        <section className="flex items-center gap-4 rounded-[28px] bg-haram-night px-5 py-5 text-ground">
          <span className="font-display text-[56px] leading-none tabular">{digits(arafah.days, locale)}</span>
          <span className="flex flex-col">
            <b className="text-[19px]">{t("daysLeft")}</b>
            <span className="text-[15px]">{t("arafah", { year: digits(arafah.year, locale) })}</span>
            <span className="text-[13px] text-[#a9cfc9]">
              {dateText(arafah.date, locale)} · {hijriDate(arafah.date, locale)}
            </span>
          </span>
        </section>
      ) : null}

      <nav aria-label={t("guideTitle")} className="grid grid-cols-2 gap-3">
        {TILES.map((tile, i) => (
          <a
            key={tile.id}
            href={`${prefix}/guide${tile.href}`}
            className={`flex flex-col gap-1 rounded-[24px] p-5 transition-transform active:scale-[0.98] ${tile.tint} ${i === 0 || (i === TILES.length - 1 && i % 2 === 1) ? "col-span-2" : ""}`}
          >
            <b className={i === 0 ? "font-display text-[26px] leading-tight" : "text-[18px]"}>{t(`tiles.${tile.id}.title`)}</b>
            <span className={`text-[14px] leading-snug ${tile.sub}`}>{t(`tiles.${tile.id}.body`)}</span>
          </a>
        ))}
      </nav>
      <p className="-mt-2 px-1 text-[13px] text-ink-3">{t("offline")}</p>

      <section className="flex flex-col gap-3 rounded-[24px] border border-line bg-paper p-5">
        <b className="text-[17px]">{t("staff.title")}</b>
        <p className="text-[14px] leading-relaxed text-ink-2">{t("staff.body")}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`${prefix}/app`} className="inline-flex h-12 items-center rounded-md bg-haram px-5 font-semibold text-white">
            {t("staff.open")}
          </a>
          <a href={`${prefix}/sign-up`} className="inline-flex h-12 items-center rounded-md border-[1.5px] border-ink px-5 font-semibold">
            {t("staff.new")}
          </a>
        </div>
      </section>

      <InstallApp />
      <a href={`${prefix}/privacy`} className="self-center text-[13px] text-ink-3 underline underline-offset-4">
        {tp("link")}
      </a>
    </main>
  );
}
