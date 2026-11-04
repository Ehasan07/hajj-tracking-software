import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { parsePassportMrz, passportValidFor } from "@hajj/core/mrz";
import { db } from "@hajj/db";
import { plans } from "@hajj/db/schema";
import { getItem } from "@hajj/sacred";
import { PaymentIcon, PayrollIcon } from "@/components/icons";
import { DraftChip, QuranAttribution, ReadingLines, StarDivider, Verses } from "@/components/sacred";
import { buttonClass } from "@/components/ui";
import { UnitIcon } from "@/components/unit-icon";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, words, type Locale } from "@/lib/format";
import { UNIT_THEME } from "@/lib/units";
import { deviceCheckEnabled } from "@/server/device-otp";
import { smsConfigured } from "@/server/sms";
import { hijriDate, nextArafah } from "@/lib/hijri";
import { PricingCards } from "./pricing-cards";
import { ThemeDemo } from "./theme-demo";
import { BrandMark } from "@/components/brand-mark";
import { HolyPhoto } from "@/components/holy-photo";
import { InstallApp } from "@/components/pwa";

/*
 * The platform's own landing page. Every picture on it is a piece of the
 * software drawn in code (a receipt, a passport's MRZ, a hotel room), filled
 * with sample data and, where the software computes something, computed by the
 * same code: the MRZ below is read by the real parser, amounts are written in
 * words by the real formatter.
 */

const CARD = "rounded-xl border border-slate-200 bg-white shadow-sm";

/** A sample passport's machine-readable lines, with correct check digits. */
const SAMPLE_MRZ = ["P<BGDUDDIN<<RAHIM<<<<<<<<<<<<<<<<<<<<<<<<<<<", "A123456784BGD7408122M3204153<<<<<<<<<<<<<<08"];

/** A small window of the software: its page title, then the page. */
function AppWindow({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <i className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <i className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </span>
        <b className="text-[13px] text-slate-700">{title}</b>
        {aside ? <span className="ml-auto">{aside}</span> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Chip({ tone = "slate", children }: { tone?: "slate" | "saffron" | "green" | "red"; children: ReactNode }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    saffron: "bg-saffron-tint text-saffron-ink",
    green: "bg-paid-tint text-paid",
    red: "bg-due-tint text-due",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------- step 1: inquiries, follow-up */

function InquiryMock({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const rows = [
    { ref: "IQ-26-000041", name: bn ? "রহিম উদ্দিন" : "Rahim Uddin", phone: "01712-345678", want: bn ? "হজ · ২ জন" : "Hajj · 2 people", chip: <Chip tone="saffron">{bn ? "আজ ফোন" : "Call today"}</Chip>, web: false },
    { ref: "IQ-26-000042", name: bn ? "নাসরিন আক্তার" : "Nasrin Akter", phone: "01819-224466", want: bn ? "ওমরা · ৩ জন" : "Umrah · 3 people", chip: <Chip>{bn ? "বৃহস্পতিবার" : "Thursday"}</Chip>, web: true },
    { ref: "IQ-26-000039", name: bn ? "আব্দুল করিম" : "Abdul Karim", phone: "01911-556677", want: bn ? "হজ · ১ জন" : "Hajj · 1 person", chip: <Chip tone="green">{bn ? "হাজী হয়েছেন" : "Registered"}</Chip>, web: false },
  ];
  return (
    <AppWindow title={bn ? "জিজ্ঞাসা" : "Inquiries"}>
      <p className="mb-3 flex items-center gap-2 rounded-sm bg-saffron-tint px-3 py-2 text-[13px] font-semibold text-saffron-ink">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M10 2.5a5 5 0 0 0-5 5v3.2L3.5 13h13L15 10.7V7.5a5 5 0 0 0-5-5Zm-1.8 12.5a1.8 1.8 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {bn ? "আজ ১ জনকে আবার ফোন করার কথা" : "1 person to call back today"}
      </p>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2">
                <b className="truncate text-[15px]">{r.name}</b>
                {r.web ? <span className="text-[11px] font-semibold text-haram">{bn ? "ওয়েবসাইট থেকে" : "from website"}</span> : null}
              </span>
              <span className="text-[12px] text-slate-500">
                <span className="font-mono">{r.ref}</span> · {digits(r.phone, locale)} · {r.want}
              </span>
            </span>
            {r.chip}
          </li>
        ))}
      </ul>
    </AppWindow>
  );
}

/* ------------------------------------------------------ step 2: passport MRZ */

function PassportMock({ locale, travelIso }: { locale: Locale; travelIso: string | null }) {
  const bn = locale === "bn";
  const parsed = parsePassportMrz(SAMPLE_MRZ.join("\n"));
  if (!parsed.ok) return null;
  const p = parsed.value;
  const valid = travelIso ? passportValidFor(p.expiryDate, travelIso) : true;
  const fields: [string, string][] = [
    [bn ? "নাম" : "Name", `${p.givenNames} ${p.surname}`],
    [bn ? "পাসপোর্ট নম্বর" : "Passport no.", p.passportNumber],
    [bn ? "জন্মতারিখ" : "Date of birth", dateText(p.dateOfBirth, locale)],
    [bn ? "মেয়াদ শেষ" : "Expires", dateText(p.expiryDate, locale)],
    [bn ? "জাতীয়তা" : "Nationality", bn ? "বাংলাদেশ" : "Bangladesh"],
    [bn ? "লিঙ্গ" : "Sex", p.sex === "M" ? (bn ? "পুরুষ" : "Male") : bn ? "নারী" : "Female"],
  ];
  return (
    <AppWindow title={bn ? "নতুন হাজী" : "New pilgrim"} aside={<span className="rounded-md bg-haram-tint px-2 py-0.5 font-mono text-[12px] font-bold text-haram-deep">HJ-26-000123</span>}>
      <p className="mb-1.5 text-[12px] font-semibold text-slate-600">{bn ? "পাসপোর্টের নিচের দুই লাইন" : "The passport's two bottom lines"}</p>
      <p className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed tracking-wide break-all text-slate-700 sm:text-[12px]">
        {SAMPLE_MRZ[0]}
        <br />
        {SAMPLE_MRZ[1]}
      </p>
      <p className="my-3 flex items-center gap-1.5 text-[13px] font-semibold text-paid">
        <Check />
        {bn ? "পাসপোর্ট পড়া হয়েছে, ঘরগুলো নিজে বসেছে" : "Passport read; the fields filled themselves"}
      </p>
      <dl className="grid grid-cols-2 gap-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-sm border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="truncate text-[14px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {valid ? (
        <p className="mt-3 text-[12px] text-slate-600">{bn ? "হজের সময়ও মেয়াদ ৬ মাসের বেশি থাকবে ✓" : "Still valid for 6+ months at Hajj ✓"}</p>
      ) : null}
    </AppWindow>
  );
}

/* ------------------------------------------------ step 3: installments, receipt */

/** The receipt's QR code, drawn as a pattern: on a real receipt it opens the check page. */
function QrMark() {
  const size = 21;
  const finder = (x: number, y: number) => {
    const dx = Math.min(x, 6 - x);
    const dy = Math.min(y, 6 - y);
    return Math.min(dx, dy) !== 1;
  };
  const cells: [number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      if (inFinder) {
        const fx = x >= size - 7 ? x - (size - 7) : x;
        const fy = y >= size - 7 ? y - (size - 7) : y;
        if (finder(fx, fy)) cells.push([x, y]);
      } else if (!(x < 8 && y < 8) && !(x >= size - 8 && y < 8) && !(x < 8 && y >= size - 8) && ((x * 7 + y * 13 + x * y) % 5 < 2)) {
        cells.push([x, y]);
      }
    }
  }
  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="h-20 w-20 shrink-0 rounded-md bg-white" aria-hidden="true" shapeRendering="crispEdges">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#12302e" />
      ))}
    </svg>
  );
}

function ReceiptMock({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const price = 68_500_000;
  const installments: [string, number, string][] = [
    [bn ? "১ম কিস্তি" : "1st", 20_000_000, bn ? "১২ মার্চ" : "12 Mar"],
    [bn ? "২য় কিস্তি" : "2nd", 10_000_000, bn ? "৩ মে" : "3 May"],
    [bn ? "৩য় কিস্তি" : "3rd", 5_000_000, bn ? "আজ" : "today"],
  ];
  const paid = installments.reduce((s, [, v]) => s + v, 0);
  return (
    <div className={`${CARD} relative overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-300 bg-slate-50 px-5 py-3">
        <span className="flex flex-col">
          <b className="text-[15px]">{bn ? "আল-মদিনা ট্রাভেলস" : "Al-Madina Travels"}</b>
          <span className="text-[12px] text-slate-500">{bn ? "টাকা জমার রসিদ" : "Payment receipt"}</span>
        </span>
        <span className="font-mono text-[12px] text-slate-600">MR-26-000219</span>
      </div>
      <div className="flex gap-4 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12px] text-slate-500">
            {bn ? "রহিম উদ্দিন" : "Rahim Uddin"} · <span className="font-mono">HJ-26-000123</span>
          </span>
          <b className="tabular text-3xl text-haram-deep">{money(5_000_000, locale)}</b>
          <span className="text-[13px] leading-snug text-slate-600">{words(5_000_000, locale)}</span>
          <span className="mt-1 text-[12px] text-slate-500">{bn ? "বিকাশ · TrxID 9F7K2LQ8XZ" : "bKash · TrxID 9F7K2LQ8XZ"}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <QrMark />
          <span className="text-[10px] text-slate-500">{bn ? "স্ক্যানে যাচাই" : "Scan to check"}</span>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <ul className="flex flex-col gap-1.5 text-[13px]">
          {installments.map(([label, amount, when]) => (
            <li key={label} className="flex items-center gap-2">
              <span className="text-paid">
                <Check />
              </span>
              <span className="flex-1 text-slate-600">
                {label} · {when}
              </span>
              <b className="tabular">{money(amount, locale)}</b>
            </li>
          ))}
        </ul>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(paid / price) * 100}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between text-[12px] text-slate-600">
          <span>
            {bn ? "জমা" : "Paid"} {money(paid, locale)}
          </span>
          <span className="font-semibold text-due">
            {bn ? "বাকি" : "Due"} {money(price - paid, locale)}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- step 4: hotel, room, bed */

function RoomMock({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  // Riyal written as "SAR", as the hotel pages show it.
  const sar = (minor: number) => `SAR ${money(minor, locale).replace(/^[^\d০-৯]+/, "")}`;
  const nights = 8;
  const rate = 48_000; // SAR 480 in halalas
  const beds = bn ? ["রহিম উদ্দিন", "কামাল হোসেন", "আহমদ আলী", null] : ["Rahim Uddin", "Kamal Hossain", "Ahmed Ali", null];
  return (
    <AppWindow title={bn ? "হোটেল" : "Hotels"} aside={<Chip tone="saffron">{bn ? "মক্কা" : "Makkah"}</Chip>}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="text-[16px]">{bn ? "রুম ৩১২ · ৪ বেড" : "Room 312 · 4 beds"}</b>
        <span className="tabular text-[14px] font-semibold text-unit-hotel">{bn ? "SAR ৪৮০ / রাত" : "SAR 480 / night"}</span>
      </div>
      <p className="text-[12px] text-slate-500">
        {bn ? "হারাম থেকে ৪০০ মিটার · ২৮ মে থেকে ৫ জুন" : "400 m from the Haram · 28 May to 5 June"}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {beds.map((b, i) => (
          <span
            key={i}
            className={`flex items-center gap-2 rounded-sm px-3 py-2.5 text-[13px] ${b ? "border border-slate-200 bg-slate-50 font-semibold" : "border border-dashed border-slate-300 text-slate-500"}`}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className={b ? "text-unit-hotel" : "text-slate-400"}>
              <path d="M2.5 15V6m0 5h15v4m0-4V9.5a2 2 0 0 0-2-2h-6V11M5.5 9.3a1.3 1.3 0 1 0 0-.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="truncate">{b ?? (bn ? "খালি বেড, হাজী বসান" : "Free bed")}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 rounded-sm bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
        {digits(nights, locale)} {bn ? "রাত" : "nights"} × {sar(rate)} = <b className="tabular">{sar(rate * nights)}</b>
      </p>
    </AppWindow>
  );
}

/* ----------------------------------------------------- step 5: guide and duas */

function DuaMock({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const talbiyah = getItem("dua_talbiyah");
  return (
    <AppWindow title={bn ? "গাইড বই · ওমরা" : "Guide · Umrah"} aside={<Chip>{bn ? "ধাপ ১: ইহরাম" : "Step 1: Ihram"}</Chip>}>
      <p lang="ar" dir="rtl" className="font-naskh text-[22px] leading-[2] text-slate-900">
        {talbiyah.verses[0]!.arabic.split("،").slice(0, 2).join("،")}
      </p>
      <p className="mt-2 text-[14px] font-semibold text-haram-deep">{(talbiyah.pronunciation ?? "").split(",").slice(0, 2).join(",")}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{talbiyah.verses[0]!.meaning[locale].split(/[।.]/)[0]}…</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(bn ? ["আরবি", "উচ্চারণ", "বাংলা অর্থ", "English"] : ["Arabic", "Pronunciation", "Bangla", "English"]).map((p) => (
          <span key={p} className="rounded-full border border-haram/30 bg-haram-tint px-2.5 py-0.5 text-[12px] font-semibold text-haram-deep">
            {p}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">{bn ? "খসড়া · আলেমের যাচাই বাকি" : "Draft · awaiting a scholar"}</span>
      </div>
    </AppWindow>
  );
}

/* ---------------------------------------------- step 6: the day's books, midnight */

function LedgerMock({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const rows: [string, number, number][] = [
    [bn ? "হজ ও ওমরা" : "Hajj and Umrah", 35_000_000, 0],
    [bn ? "জমজম পানি" : "Zamzam water", 1_240_000, 180_000],
    [bn ? "ঔষধের দোকান" : "Medicine shop", 865_000, 210_000],
    [bn ? "অফিস খরচ" : "Office costs", 0, 2_200_000],
  ];
  const inSum = rows.reduce((s, [, a]) => s + a, 0);
  const outSum = rows.reduce((s, [, , b]) => s + b, 0);
  const opening = 12_050_000;
  const cell = (v: number) => (v ? money(v, locale) : "—");
  return (
    <AppWindow
      title={bn ? "দিনশেষের হিসাব" : "Day's statement"}
      aside={
        <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-600">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {bn ? "রাত ১২টায় বন্ধ" : "Closed at midnight"}
        </span>
      }
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] text-slate-500">
            <th className="pb-2 font-semibold">{bn ? "ব্যবসা" : "Business"}</th>
            <th className="pb-2 text-right font-semibold">{bn ? "জমা" : "In"}</th>
            <th className="pb-2 text-right font-semibold">{bn ? "খরচ" : "Out"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <td className="py-1.5 text-slate-700">{label}</td>
              <td className="tabular py-1.5 text-right">{cell(a)}</td>
              <td className={`tabular py-1.5 text-right ${b ? "text-due" : ""}`}>{cell(b)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 font-bold">
            <td className="pt-2">{bn ? "আজ মোট" : "Today"}</td>
            <td className="tabular pt-2 text-right">{money(inSum, locale)}</td>
            <td className="tabular pt-2 text-right text-due">{money(outSum, locale)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <span className="rounded-sm bg-slate-50 px-3 py-2">
          <span className="block text-slate-500">{bn ? "আগের দিনের জের" : "Brought forward"}</span>
          <b className="tabular text-[14px]">{money(opening, locale)}</b>
        </span>
        <span className="rounded-sm bg-emerald-50 px-3 py-2">
          <span className="block text-slate-500">{bn ? "আজকের জের" : "Carried forward"}</span>
          <b className="tabular text-[14px] text-emerald-700">{money(opening + inSum - outSum, locale)}</b>
        </span>
      </div>
    </AppWindow>
  );
}

/* ---------------------------------------------------------- security icons */

const SECURITY_ICON: Record<string, ReactNode> = {
  passport: <path d="M6 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Zm5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-3 9h6" />,
  separate: <path d="M4 6.5c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5-3.1 2.5-7 2.5-7-1.1-7-2.5Zm0 0v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M4 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />,
  device: <path d="M7.5 3.5h7A1.5 1.5 0 0 1 16 5v14a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5Zm1.5 9h4M9 9h4m-2.5 8h1" />,
  audit: <path d="M7 4.5h8l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6a1.5 1.5 0 0 1 1-1.5Zm2 6h6m-6 3h6m-6 3h4" />,
  backup: <path d="M7 17.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 16.5 17.5M11 11v8m-2.5-2.5L11 19l2.5-2.5" />,
  qr: <path d="M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm11 1h2v2h-2Zm3 3h2v2h-2Zm-3 2h2m1-6h2" />,
};

/* ------------------------------------------------------------------- page */

export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations("landing");
  const ts = await getTranslations("site");
  const tp = await getTranslations("privacy");
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
  const travelIso = arafah ? arafah.date.toISOString().slice(0, 10) : null;
  // How far through the lunar year to the next Arafah (about 354 days).
  const yearDone = arafah ? Math.min(Math.max(1 - arafah.days / 354, 0), 1) : 0;

  const steps = [
    { key: "inquiry", mock: <InquiryMock locale={locale} /> },
    { key: "passport", mock: <PassportMock locale={locale} travelIso={travelIso} /> },
    { key: "receipt", mock: <ReceiptMock locale={locale} /> },
    { key: "hotel", mock: <RoomMock locale={locale} /> },
    { key: "journey", mock: <DuaMock locale={locale} /> },
    { key: "books", mock: <LedgerMock locale={locale} /> },
  ] as const;

  const security = ["passport", "separate", ...(deviceCheckEnabled() ? (["device"] as const) : []), "audit", "backup", "qr"] as const;

  return (
    <div className="relative overflow-x-clip bg-slate-50 text-ink">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <b className="text-lg whitespace-nowrap">{t("brand")}</b>
          </a>
          <nav aria-label={t("nav.label")} className="hidden items-center gap-1 text-[15px] lg:flex">
            {(["journey", "website", "security", "pricing"] as const).map((id) => (
              <a key={id} href={`#${id}`} className="rounded-sm px-3 py-2 text-slate-700 hover:bg-white">
                {t(`nav.${id}`)}
              </a>
            ))}
            <Link href="/guide" className="rounded-sm px-3 py-2 font-semibold text-haram-deep hover:bg-white">
              {t("nav.book")}
            </Link>
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/" locale={locale === "bn" ? "en" : "bn"} className="rounded-sm px-3 py-2 text-[15px] font-semibold text-slate-600 hover:bg-white">
              {locale === "bn" ? "EN" : "বাংলা"}
            </Link>
            <Link href="/sign-in" className="hidden rounded-sm px-3 py-2 text-[15px] font-semibold hover:bg-white sm:inline-flex">
              {t("signIn")}
            </Link>
            <Link href="/sign-up" className={buttonClass("primary", "h-10 !rounded-xl px-4 text-[15px]")}>
              {t("start")}
            </Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section id="top" className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-[44px] leading-[1.1] text-slate-900 sm:text-6xl">{t("hero.title")}</h1>
          <p className="max-w-xl text-[18px] leading-relaxed text-slate-600">{t("hero.body")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonClass("primary", "h-12 !rounded-xl px-6 text-[17px]")}>
              {t("hero.cta", { days: digits(trialDays, locale) })}
            </Link>
            <a href="#journey" className={buttonClass("outline", "h-12 !rounded-xl border-slate-300 px-6 text-[17px]")}>
              {t("hero.how")}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-slate-600">
            {(["noCard", "bangla", "money", "phone"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="text-emerald-600">
                  <Check />
                </span>
                {t(`hero.facts.${k}`)}
              </li>
            ))}
          </ul>
          <InstallApp className="w-fit" />
        </div>

        <div className="flex flex-col">
          <HolyPhoto photo="kaabaDoor" locale={locale} priority captionAt="top" className="rounded-xl border border-slate-200 shadow-sm" imgClassName="aspect-[16/10]" sizes="(min-width: 1024px) 45vw, 100vw" />
        {arafah ? (
          <aside aria-label={t("arafah.label")} className={`${CARD} relative z-10 mx-3 -mt-16 flex flex-col gap-5 p-6 sm:mx-6 sm:p-7`}>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-haram-tint px-3 py-1 text-[13px] font-bold text-haram-deep">{t("arafah.season", { year: digits(arafah.year, locale) })}</span>
              <svg viewBox="0 0 40 40" className="h-8 w-8 text-saffron-deep" aria-hidden="true">
                <path fill="currentColor" d="M27 6a15 15 0 1 0 7 26A13 13 0 1 1 27 6z" />
              </svg>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-display text-[88px] leading-none text-slate-900 tabular">{digits(arafah.days, locale)}</span>
              <span className="pb-3 text-[18px] font-semibold text-slate-700">{t("arafah.days")}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
                <div className="h-full rounded-full bg-haram" style={{ width: `${Math.round(yearDone * 100)}%` }} />
              </div>
              <p className="flex flex-wrap justify-between gap-x-4 text-[14px]">
                <span className="font-semibold">{dateText(arafah.date, locale)}</span>
                <span className="text-slate-500">{hijri}</span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              {(["passport", "visa", "flight"] as const).map((k) => (
                <span key={k} className="rounded-sm bg-slate-50 px-2 py-2 text-[12px] leading-snug text-slate-600">
                  {t(`arafah.checks.${k}`)}
                </span>
              ))}
            </div>
            <p className="text-[12px] leading-snug text-slate-500">{t("arafah.note")}</p>
          </aside>
        ) : null}
        </div>
      </section>

      {/* ----------------------------------------------------------- journey */}
      <section id="journey" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{t("journey.title")}</h2>
            <p className="text-[17px] leading-relaxed text-slate-600">{t("journey.body")}</p>
          </div>
          <ol className="flex flex-col gap-20">
            {steps.map(({ key, mock }, i) => (
              <li key={key} className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="flex flex-col gap-4 lg:pt-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-haram text-[15px] font-bold text-white">{digits(i + 1, locale)}</span>
                    <span className="flex gap-1" aria-hidden="true">
                      {steps.map((s, j) => (
                        <i key={s.key} className={`h-1.5 w-5 rounded-full ${j <= i ? "bg-haram" : "bg-slate-200"}`} />
                      ))}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 sm:text-[28px]">{t(`journey.steps.${key}.title`)}</h3>
                  <p className="text-[17px] leading-relaxed text-slate-600">{t(`journey.steps.${key}.body`)}</p>
                  <ul className="flex flex-col gap-2 text-[15px] text-slate-700">
                    {(t.raw(`journey.steps.${key}.points`) as string[]).map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-1 text-emerald-600">
                          <Check />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>{mock}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------- businesses */}
      <section id="businesses" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{t("businesses.title")}</h2>
          <p className="text-[17px] leading-relaxed text-slate-600">{t("businesses.body")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["zamzam", "medicine", "coffee", "supernova"] as const).map((u) => (
            <div key={u} className={`${CARD} flex gap-4 p-5`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm" style={{ background: UNIT_THEME[u].tint }}>
                <UnitIcon unit={u} size={24} tint="var(--color-paper)" />
              </span>
              <span className="flex flex-col gap-1">
                <b className="text-[17px]" style={{ color: UNIT_THEME[u].color }}>
                  {t(`businesses.units.${u}.title`)}
                </b>
                <span className="text-[15px] leading-relaxed text-slate-600">{t(`businesses.units.${u}.body`)}</span>
              </span>
            </div>
          ))}
          {(
            [
              ["expenses", PaymentIcon],
              ["payroll", PayrollIcon],
            ] as const
          ).map(([k, Icon]) => (
            <div key={k} className={`${CARD} flex gap-4 p-5`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-unit-office-tint">
                <Icon size={24} tint="var(--color-paper)" />
              </span>
              <span className="flex flex-col gap-1">
                <b className="text-[17px] text-unit-office">{t(`businesses.units.${k}.title`)}</b>
                <span className="text-[15px] leading-relaxed text-slate-600">{t(`businesses.units.${k}.body`)}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="max-w-3xl rounded-xl border border-haram/20 bg-haram-tint/60 px-5 py-4 text-[16px] leading-relaxed text-haram-deep">{t("businesses.logins")}</p>
      </section>

      {/* ----------------------------------------------------------- website */}
      <section id="website" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{t("website.title")}</h2>
            <p className="text-[17px] leading-relaxed text-slate-600">{t("website.body")}</p>
            <ul className="flex flex-col gap-2.5 text-[16px] text-slate-700">
              {(["look", "posts", "reviews", "inquiries"] as const).map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-1 text-emerald-600">
                    <Check />
                  </span>
                  {t(`website.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <ThemeDemo />
        </div>
      </section>

      {/* ---------------------------------------------------------- security */}
      <section id="security" className="scroll-mt-20 bg-haram-night text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{t("security.title")}</h2>
            <p className="text-[17px] leading-relaxed text-[#bcd8d3]">{t("security.body")}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {security.map((k) => (
              <li key={k} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-saffron">
                    <svg viewBox="0 0 22 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {SECURITY_ICON[k]}
                    </svg>
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-[#cfe5e1]">{t(`security.points.${k}.tag`)}</span>
                </span>
                <b className="text-[17px]">{t(`security.points.${k}.title`)}</b>
                <span className="text-[15px] leading-relaxed text-[#c7ddd9]">{t(`security.points.${k}.body`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      {plansList.length > 0 ? (
        <section id="pricing" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{t("pricing.title")}</h2>
            <p className="text-[17px] leading-relaxed text-slate-600">
              {t("pricing.body", { days: digits(trialDays, locale), plan: trialName ? (locale === "bn" ? trialName.nameBn : trialName.nameEn) : "" })}
            </p>
          </div>
          <PricingCards
            plans={plansList.map((p) => ({
              code: p.code,
              name: locale === "bn" ? p.nameBn : p.nameEn,
              tagline: locale === "bn" ? p.taglineBn : p.taglineEn,
              priceMonthly: p.priceMonthly,
              priceYearly: p.priceYearly,
              pilgrims: p.limits.pilgrimsPerYear,
              staff: p.limits.staffSeats,
              sms: smsConfigured() ? p.limits.smsPerMonth : undefined,
            }))}
            featured="standard"
          />
        </section>
      ) : null}

      {/* ----------------------------------------------------- the two cities */}
      <section aria-labelledby="places-title" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-20 sm:px-6">
        <h2 id="places-title" className="font-display text-3xl leading-tight text-slate-900 sm:text-4xl">
          {t("places.title")}
        </h2>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:grid-rows-2">
          <HolyPhoto photo="kaabaHajj" locale={locale} className="rounded-xl lg:row-span-2" imgClassName="aspect-[4/3] lg:aspect-auto" sizes="(min-width: 1024px) 60vw, 100vw" />
          <HolyPhoto photo="greenDome" locale={locale} className="rounded-xl" imgClassName="aspect-[16/10]" sizes="(min-width: 1024px) 35vw, 100vw" />
          <HolyPhoto photo="nabawiUmbrellas" locale={locale} className="rounded-xl" imgClassName="aspect-[16/10]" sizes="(min-width: 1024px) 35vw, 100vw" />
        </div>

        <h3 className="mt-6 font-display text-2xl text-slate-900">{t("places.days.title")}</h3>
        <ol className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {(
            [
              ["mina", "minaPilgrims"],
              ["arafah", "arafah"],
              ["muzdalifah", "muzdalifah"],
              ["jamarat", "jamarat"],
            ] as const
          ).map(([key, photo]) => (
            <li key={key} className={`${CARD} flex w-[80%] shrink-0 snap-start flex-col overflow-hidden sm:w-auto`}>
              <HolyPhoto photo={photo} locale={locale} caption={false} imgClassName="aspect-[4/3]" sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 80vw" />
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[13px] font-semibold text-emerald-700">{t(`places.days.${key}.date`)}</span>
                <b className="text-lg text-slate-900">{t(`places.days.${key}.name`)}</b>
                <span className="text-[14px] leading-relaxed text-slate-600">{t(`places.days.${key}.text`)}</span>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-6 font-display text-2xl text-slate-900">{t("places.visits")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["haramNight", "quba", "jabalNour"] as const).map((photo) => (
            <HolyPhoto key={photo} photo={photo} locale={locale} className="rounded-xl" imgClassName="aspect-[4/3]" sizes="(min-width: 640px) 33vw, 100vw" />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- ayah */}
      <section className="mx-auto mb-16 w-full max-w-4xl px-4 sm:px-6">
        <div className={`${CARD} flex flex-col gap-5 px-5 py-10 sm:px-12`}>
          <StarDivider />
          <Verses item={house} className="text-center text-[26px] sm:text-[32px]" />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-sm bg-slate-50 px-5 py-4">
            <DraftChip label={ts("draftChip")} />
            <ReadingLines
              item={house}
              pronunciation={house.pronunciation ?? null}
              meanings={house.verses.map((v) => v.meaning[locale])}
              locale={locale}
              labels={{ pronunciation: ts("pronunciation"), meaning: ts("meaning") }}
            />
          </div>
          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
            {house.citation[locale]} <QuranAttribution locale={locale} />
          </p>
          <div className="mt-2 flex flex-col items-center gap-4 border-t border-slate-100 pt-8 text-center">
            <p className="max-w-xl font-display text-3xl leading-snug text-slate-900">{t("closing.title")}</p>
            <Link href="/sign-up" className={buttonClass("primary", "h-12 !rounded-xl px-6 text-[17px]")}>
              {t("hero.cta", { days: digits(trialDays, locale) })}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[14px] text-slate-500 sm:px-6">
          <span className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <b className="text-ink">{t("brand")}</b>
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <span>© {digits(new Date().getFullYear(), locale)}</span>
            <Link href="/guide" className="underline underline-offset-4">
              {t("nav.book")}
            </Link>
            <Link href="/privacy" className="underline underline-offset-4">
              {tp("link")}
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
