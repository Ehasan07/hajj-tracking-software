import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { db } from "@hajj/db";
import { plans } from "@hajj/db/schema";
import { getItem } from "@hajj/sacred";
import { HotelIcon, PaymentIcon, PayrollIcon, ReceiptIcon, ShieldIcon } from "@/components/icons";
import { DraftChip, LabbaikOrnament, QuranAttribution, ReadingLines, StarDivider, Verses } from "@/components/sacred";
import { buttonClass } from "@/components/ui";
import { UnitIcon } from "@/components/unit-icon";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, words, type Locale } from "@/lib/format";
import { UNIT_THEME } from "@/lib/units";
import { deviceCheckEnabled } from "@/server/device-otp";
import { smsConfigured } from "@/server/sms";
import { hijriDate, nextArafah } from "@/lib/hijri";
import { ThemeDemo } from "./theme-demo";
import { BrandMark } from "@/components/brand-mark";
import { InstallApp } from "@/components/pwa";

/** The step marker: an arch, like the doorways of the Haram, holding the step's number. */
function Arch({ n, locale }: { n: number; locale: Locale }) {
  return (
    <span className="relative z-10 flex h-14 w-12 shrink-0 items-center justify-center rounded-[24px_24px_8px_8px] bg-haram font-display text-xl text-white shadow-[0_0_0_6px_var(--color-ground)]">
      {digits(n, locale)}
    </span>
  );
}

/* --------------------------------------------- snippets of the real software */

function Slip({ children, className = "", dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  const tone = dark ? "bg-haram-night text-ground" : "border border-line bg-paper";
  return <div className={`rounded-[14px] p-5 shadow-[0_24px_40px_-32px_rgb(18_48_46/0.5)] ${tone} ${className}`}>{children}</div>;
}

function InquirySlip({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  return (
    <Slip className="border-l-[6px] border-l-saffron">
      <div className="flex items-center justify-between text-[13px]">
        <b className="font-mono text-ink-2">IQ-26-000041</b>
        <span className="rounded-full bg-saffron-tint px-2.5 py-0.5 font-bold text-saffron-ink">{bn ? "আবার ফোন: বৃহস্পতিবার" : "Call back: Thursday"}</span>
      </div>
      <p className="mt-3 text-[17px] font-bold">{bn ? "রহিম উদ্দিন" : "Rahim Uddin"}</p>
      <p className="text-[14px] text-ink-2">{digits("01712-345678", locale)}</p>
      <p className="mt-2 text-[14px] text-ink-3">{bn ? "আগ্রহ: হজ, সাধারণ প্যাকেজ, ২ জন" : "Interested in: Hajj, standard package, 2 people"}</p>
    </Slip>
  );
}

function PassportSlip({ locale }: { locale: Locale }) {
  return (
    <Slip>
      <p className="font-mono text-[12px] leading-relaxed tracking-wider break-all text-ink-3">
        P&lt;BGDUDDIN&lt;&lt;RAHIM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        <br />
        A123456782BGD7408122M3204159&lt;&lt;&lt;&lt;&lt;&lt;04
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-haram-tint px-3 py-1.5 font-mono text-[15px] font-bold text-haram-deep">HJ-26-000123</span>
        <span className="text-[14px] text-ink-2">{locale === "bn" ? "মেয়াদ: ১৫ এপ্রিল ২০৩২" : "Expires 15 April 2032"}</span>
      </div>
    </Slip>
  );
}

function ReceiptSlip({ locale }: { locale: Locale }) {
  const paid = 35_000_000;
  const total = 68_500_000;
  return (
    <Slip className="relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] text-ink-3">RC-26-000219</span>
          <b className="tabular text-3xl text-haram">{money(5_000_000, locale)}</b>
          <span className="text-[13px] text-ink-2">{words(5_000_000, locale)}</span>
        </div>
        {/* A stand-in for the receipt's QR code. */}
        <svg viewBox="0 0 7 7" className="h-16 w-16 shrink-0 text-ink" aria-hidden="true" shapeRendering="crispEdges">
          {[
            "1110111",
            "1010101",
            "1110111",
            "0001000",
            "1101011",
            "0110110",
            "1011101",
          ].flatMap((row, y) => [...row].map((on, x) => (on === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)))}
        </svg>
      </div>
      <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-line-strong pt-3">
        <div className="h-2 overflow-hidden rounded-full bg-ground">
          <div className="h-full rounded-full bg-paid" style={{ width: `${(paid / total) * 100}%` }} />
        </div>
        <span className="text-[13px] text-ink-2">
          {locale === "bn" ? `জমা ${money(paid, locale)}, বাকি ${money(total - paid, locale)}` : `Paid ${money(paid, locale)}, due ${money(total - paid, locale)}`}
        </span>
      </div>
    </Slip>
  );
}

function RoomSlip({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const beds = bn ? ["রউ", "কম", "আহ", null] : ["RU", "KM", "AH", null];
  return (
    <Slip>
      <div className="flex items-center gap-2 text-[14px]">
        <HotelIcon size={20} tint="var(--color-unit-hotel-tint)" />
        <b>{bn ? "মক্কা, রুম ৩১২" : "Makkah, room 312"}</b>
        <span className="ml-auto text-ink-3">{bn ? "SAR ৪৮০ / রাত" : "SAR 480 / night"}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {beds.map((b, i) => (
          <span
            key={i}
            className={`flex h-14 items-center justify-center rounded-[18px_18px_6px_6px] text-[14px] font-bold ${b ? "bg-unit-hotel-tint text-unit-hotel" : "border-[1.5px] border-dashed border-line-strong text-ink-3"}`}
          >
            {b ?? (bn ? "খালি" : "free")}
          </span>
        ))}
      </div>
    </Slip>
  );
}

function DuaSlip({ locale }: { locale: Locale }) {
  const talbiyah = getItem("dua_talbiyah");
  return (
    <Slip dark>
      <p lang="ar" dir="rtl" className="font-naskh text-[22px] leading-[1.9]">
        {talbiyah.verses[0]!.arabic.split("،").slice(0, 2).join("،")}
      </p>
      <p className="mt-2 text-[14px] text-[#a9cfc9]">{talbiyah.pronunciation?.slice(0, 64) ?? talbiyah.title[locale]}…</p>
    </Slip>
  );
}

function StatementSlip({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const rows: [string, number][] = [
    [bn ? "হজ ও ওমরা" : "Hajj and Umrah", 35_000_000],
    [bn ? "জমজম পানি" : "Zamzam water", 1_240_000],
    [bn ? "ঔষধের দোকান" : "Medicine shop", 865_000],
    [bn ? "অফিস খরচ" : "Office costs", -2_200_000],
  ];
  const net = rows.reduce((s, [, v]) => s + v, 0);
  return (
    <Slip>
      <p className="text-[13px] text-ink-3">{bn ? "১৯ অক্টোবর, রাত ১২টায় তৈরি" : "Made at midnight, 19 October"}</p>
      <dl className="mt-3 flex flex-col gap-1.5 text-[14px]">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-2">{label}</dt>
            <dd className={`tabular font-semibold ${v < 0 ? "text-due" : ""}`}>{v < 0 ? `−${money(-v, locale)}` : money(v, locale)}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 border-t border-line pt-2 text-[16px]">
          <dt className="font-bold">{bn ? "নিট" : "Net"}</dt>
          <dd className="tabular font-bold text-haram">{money(net, locale)}</dd>
        </div>
      </dl>
    </Slip>
  );
}

/* ------------------------------------------------------------------- page */

export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations("landing");
  const ts = await getTranslations("site");
  const arafah = nextArafah();
  const plansList = await db
    .select({ code: plans.code, nameBn: plans.nameBn, nameEn: plans.nameEn, taglineBn: plans.taglineBn, taglineEn: plans.taglineEn, priceMonthly: plans.priceMonthly, priceYearly: plans.priceYearly, limits: plans.limits })
    .from(plans)
    .where(eq(plans.active, true))
    .orderBy(asc(plans.sortOrder), asc(plans.priceMonthly));
  const trialDays = Number(process.env.TRIAL_DAYS ?? 30);
  const trialPlan = process.env.TRIAL_PLAN ?? "premium";
  const trialName = plansList.find((p) => p.code === trialPlan);
  const house = getItem("ayah_first_house");
  const hijri = arafah ? hijriDate(arafah.date, locale) : "";

  const steps = [
    { key: "inquiry", snippet: <InquirySlip locale={locale} /> },
    { key: "passport", snippet: <PassportSlip locale={locale} /> },
    { key: "receipt", snippet: <ReceiptSlip locale={locale} /> },
    { key: "hotel", snippet: <RoomSlip locale={locale} /> },
    { key: "journey", snippet: <DuaSlip locale={locale} /> },
    { key: "books", snippet: <StatementSlip locale={locale} /> },
  ] as const;

  const security = [
    "passport",
    "separate",
    ...(deviceCheckEnabled() ? (["device"] as const) : []),
    "lock",
    "audit",
    "backup",
    "qr",
  ] as const;

  return (
    <div className="relative overflow-x-clip">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5">
            <BrandMark className="h-11 w-11" />
            <b className="text-lg whitespace-nowrap">{t("brand")}</b>
          </a>
          <nav aria-label={t("nav.label")} className="hidden items-center gap-1 text-[15px] lg:flex">
            {(["journey", "businesses", "website", "pricing"] as const).map((id) => (
              <a key={id} href={`#${id}`} className="rounded-md px-3.5 py-2.5 hover:bg-haram-tint">
                {t(`nav.${id}`)}
              </a>
            ))}
            <Link href="/guide" className="rounded-md px-3.5 py-2.5 font-semibold text-haram-deep hover:bg-haram-tint">
              {t("nav.book")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" locale={locale === "bn" ? "en" : "bn"} className="rounded-md px-3 py-2.5 text-[15px] font-semibold text-ink-2 hover:bg-paper">
              {locale === "bn" ? "EN" : "বাংলা"}
            </Link>
            <Link href="/sign-in" className="hidden rounded-md px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-paper sm:inline-flex">
              {t("signIn")}
            </Link>
            <Link href="/sign-up" className={buttonClass("primary", "h-11 px-4 text-[15px]")}>
              {t("start")}
            </Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-8 lg:grid-cols-12 lg:pt-20">
        <LabbaikOrnament className="pointer-events-none absolute -top-10 -right-10 text-[260px] text-haram-tint/80 sm:text-[360px]" />
        <div className="relative flex flex-col gap-7 lg:col-span-7">
          <h1 className="animate-rise font-display text-[46px] leading-[1.1] sm:text-6xl lg:text-[76px]">{t("hero.title")}</h1>
          <p className="max-w-xl animate-rise text-[19px] leading-relaxed text-ink-2 [animation-delay:100ms]">{t("hero.body")}</p>
          <div className="flex animate-rise flex-wrap items-center gap-3 [animation-delay:180ms]">
            <Link href="/sign-up" className={buttonClass("primary", "h-14 px-7 text-lg")}>
              {t("hero.cta", { days: digits(trialDays, locale) })}
            </Link>
            <Link href="/sign-in" className={buttonClass("outline", "h-14 px-7 text-lg")}>
              {t("signIn")}
            </Link>
          </div>
          <p className="animate-rise font-hand text-xl text-ink-3 [animation-delay:240ms]">{t("hero.note")}</p>
          <InstallApp className="w-fit" />
        </div>

        {arafah ? (
          <aside aria-label={t("arafah.label")} className="relative flex justify-center lg:col-span-5">
            <div className="relative flex w-full max-w-[380px] animate-[reveal_1.1s_0.15s_cubic-bezier(.6,0,.2,1)_both] flex-col items-center gap-3 overflow-hidden rounded-[190px_190px_28px_28px] bg-haram-night px-8 pt-16 pb-9 text-center text-ground shadow-[0_40px_80px_-40px_rgb(18_48_46/0.7)]">
              <svg viewBox="0 0 40 40" className="h-11 w-11 text-saffron" aria-hidden="true">
                <path fill="currentColor" d="M27 6a15 15 0 1 0 7 26A13 13 0 1 1 27 6z" />
              </svg>
              <span className="text-[16px] text-[#a9cfc9]">{t("arafah.until", { year: digits(arafah.year, locale) })}</span>
              <span className="font-display text-[96px] leading-none tabular">{digits(arafah.days, locale)}</span>
              <span className="text-xl font-semibold">{t("arafah.days")}</span>
              <span className="mt-2 border-t border-[#2a6a64] pt-3 text-[15px]">
                {dateText(arafah.date, locale)}
                <br />
                <span className="text-[#a9cfc9]">{hijri}</span>
              </span>
              <span className="text-[12px] leading-snug text-[#a9cfc9]">{t("arafah.note")}</span>
            </div>
          </aside>
        ) : null}
      </section>

      {/* ----------------------------------------------------------- journey */}
      <section id="journey" className="scroll-mt-20 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-24 sm:px-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("journey.title")}</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">{t("journey.body")}</p>
          </div>
          <ol className="relative flex flex-col gap-14">
            <span className="absolute top-4 bottom-4 left-[23px] w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_8px,transparent_8px_16px)]" aria-hidden="true" />
            {steps.map(({ key, snippet }, i) => (
              <li key={key} className="relative grid gap-6 pl-0 md:grid-cols-[48px_1fr_1fr] md:items-start md:gap-10">
                <div className="flex items-center gap-4 md:block">
                  <Arch n={i + 1} locale={locale} />
                  <h3 className="text-2xl font-bold md:hidden">{t(`journey.steps.${key}.title`)}</h3>
                </div>
                <div className="flex flex-col gap-2 pl-16 md:pt-2 md:pl-0">
                  <h3 className="hidden text-2xl font-bold md:block">{t(`journey.steps.${key}.title`)}</h3>
                  <p className="text-[17px] leading-relaxed text-ink-2">{t(`journey.steps.${key}.body`)}</p>
                </div>
                <div className="pl-16 md:pl-0">{snippet}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------- businesses */}
      <section id="businesses" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-24 sm:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("businesses.title")}</h2>
          <p className="text-[17px] leading-relaxed text-ink-2">{t("businesses.body")}</p>
        </div>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {(["zamzam", "medicine", "coffee", "supernova"] as const).map((u) => (
            <div key={u} className="flex gap-4">
              <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[24px_24px_10px_10px]" style={{ background: UNIT_THEME[u].tint }}>
                <UnitIcon unit={u} size={28} tint="var(--color-paper)" />
              </span>
              <span className="flex flex-col gap-1">
                <b className="text-lg" style={{ color: UNIT_THEME[u].color }}>
                  {t(`businesses.units.${u}.title`)}
                </b>
                <span className="text-[15px] leading-relaxed text-ink-2">{t(`businesses.units.${u}.body`)}</span>
              </span>
            </div>
          ))}
          {(
            [
              ["expenses", PaymentIcon],
              ["payroll", PayrollIcon],
            ] as const
          ).map(([k, Icon]) => (
            <div key={k} className="flex gap-4">
              <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[24px_24px_10px_10px] bg-unit-office-tint">
                <Icon size={28} tint="var(--color-paper)" />
              </span>
              <span className="flex flex-col gap-1">
                <b className="text-lg text-unit-office">{t(`businesses.units.${k}.title`)}</b>
                <span className="text-[15px] leading-relaxed text-ink-2">{t(`businesses.units.${k}.body`)}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="max-w-3xl rounded-lg bg-haram-tint px-6 py-4 text-[16px] leading-relaxed text-haram-deep">{t("businesses.logins")}</p>
      </section>

      {/* ----------------------------------------------------------- website */}
      <section id="website" className="scroll-mt-20 bg-haram-tint/50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("website.title")}</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">{t("website.body")}</p>
            <ul className="flex flex-col gap-2.5 text-[16px]">
              {(["look", "posts", "reviews", "inquiries"] as const).map((k) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-saffron-deep" aria-hidden="true" />
                  {t(`website.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <ThemeDemo />
        </div>
      </section>

      {/* ---------------------------------------------------------- security */}
      <section id="security" className="bg-haram-night text-ground">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-24 sm:px-8">
          <div className="flex max-w-2xl items-start gap-5">
            <span className="flex h-16 w-14 shrink-0 items-center justify-center rounded-[28px_28px_10px_10px] bg-[#14635d]">
              <ShieldIcon size={30} tint="transparent" accent="var(--color-saffron)" />
            </span>
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("security.title")}</h2>
              <p className="text-[17px] leading-relaxed text-[#a9cfc9]">{t("security.body")}</p>
            </div>
          </div>
          <ul className="grid gap-x-12 gap-y-6 md:grid-cols-2">
            {security.map((k) => (
              <li key={k} className="flex flex-col gap-1 border-t border-[#2a6a64] pt-4">
                <b className="text-[17px]">{t(`security.points.${k}.title`)}</b>
                <span className="text-[15px] leading-relaxed text-[#c7ddd9]">{t(`security.points.${k}.body`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      {plansList.length > 0 ? (
        <section id="pricing" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-24 sm:px-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("pricing.title")}</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">
              {t("pricing.body", { days: digits(trialDays, locale), plan: trialName ? (locale === "bn" ? trialName.nameBn : trialName.nameEn) : "" })}
            </p>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-3">
            {plansList.map((p) => {
              const featured = p.code === "standard";
              const limit = (n: number | null | undefined) => (n == null ? t("pricing.unlimited") : digits(n, locale));
              return (
                <article
                  key={p.code}
                  className={`flex flex-col gap-4 rounded-[120px_120px_24px_24px] px-7 pt-14 pb-7 text-center ${featured ? "bg-haram-night text-ground" : "border border-line bg-paper"}`}
                >
                  <h3 className="text-2xl font-bold">{locale === "bn" ? p.nameBn : p.nameEn}</h3>
                  {(locale === "bn" ? p.taglineBn : p.taglineEn) ? (
                    <p className={`text-[14px] ${featured ? "text-[#a9cfc9]" : "text-ink-3"}`}>{locale === "bn" ? p.taglineBn : p.taglineEn}</p>
                  ) : null}
                  <p className="flex flex-col">
                    <b className={`tabular text-4xl ${featured ? "text-saffron" : "text-haram"}`}>{money(p.priceMonthly, locale)}</b>
                    <span className={`text-[14px] ${featured ? "text-[#a9cfc9]" : "text-ink-3"}`}>{t("pricing.perMonth")}</span>
                  </p>
                  <p className={`text-[14px] ${featured ? "text-[#c7ddd9]" : "text-ink-2"}`}>{t("pricing.yearly", { price: money(p.priceYearly, locale) })}</p>
                  <ul className={`flex flex-col gap-2 border-t border-dashed pt-4 text-left text-[15px] ${featured ? "border-[#2a6a64]" : "border-line-strong"}`}>
                    <li>{t("pricing.pilgrims", { n: limit(p.limits.pilgrimsPerYear) })}</li>
                    <li>{t("pricing.staff", { n: limit(p.limits.staffSeats) })}</li>
                    {/* Only promised once the server can actually send SMS. */}
                    {smsConfigured() ? <li>{t("pricing.sms", { n: limit(p.limits.smsPerMonth) })}</li> : null}
                  </ul>
                  <Link href="/sign-up" className={featured ? buttonClass("saffron", "mt-auto w-full") : buttonClass("outline", "mt-auto w-full")}>
                    {t("pricing.cta")}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- ayah */}
      <section className="relative mx-auto mb-16 w-full max-w-5xl px-4 sm:px-8">
        <div className="flex flex-col gap-5 rounded-[160px_160px_24px_24px] bg-paper px-6 pt-14 pb-10 shadow-[0_30px_60px_-40px_rgb(18_48_46/0.45)] sm:px-14">
          <StarDivider />
          <Verses item={house} className="text-center text-[26px] sm:text-[32px]" />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[24px_24px_14px_14px] bg-ground px-6 py-5">
            <DraftChip label={ts("draftChip")} />
            <ReadingLines
              item={house}
              pronunciation={house.pronunciation ?? null}
              meanings={house.verses.map((v) => v.meaning[locale])}
              locale={locale}
              labels={{ pronunciation: ts("pronunciation"), meaning: ts("meaning") }}
            />
          </div>
          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-3">
            {house.citation[locale]} <QuranAttribution locale={locale} />
          </p>
          <div className="mt-4 flex flex-col items-center gap-4 border-t border-line pt-8 text-center">
            <p className="max-w-xl font-display text-3xl leading-snug">{t("closing.title")}</p>
            <Link href="/sign-up" className={buttonClass("primary", "h-14 px-7 text-lg")}>
              {t("hero.cta", { days: digits(trialDays, locale) })}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[14px] text-ink-3 sm:px-8">
          <span className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <b className="text-ink">{t("brand")}</b>
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <span>© {digits(new Date().getFullYear(), locale)}</span>
            <Link href="/guide" className="underline underline-offset-4">
              {t("nav.book")}
            </Link>
            <Link href="/sign-in" className="underline underline-offset-4">
              {t("signIn")}
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
