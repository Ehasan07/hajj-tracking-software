import { AYAH_END, arabicNumber, BASMALAH, LABBAIK, QURAN_ATTRIBUTION, RUB_EL_HIZB, type ResolvedItem } from "@hajj/sacred";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/format";
import { Khatam } from "./ui";

/** Arabic, right to left, in the font that suits its source. */
export function ArabicText({
  children,
  source,
  className = "",
}: {
  children: ReactNode;
  source: "quran" | "hadith";
  className?: string;
}) {
  return (
    <p lang="ar" dir="rtl" className={`${source === "quran" ? "font-quran" : "font-naskh"} text-right ${className}`}>
      {children}
    </p>
  );
}

/** Verses with the end-of-ayah sign and its number, as in a printed mushaf. */
export function Verses({ item, className = "text-[26px]" }: { item: ResolvedItem; className?: string }) {
  const quran = item.verses[0]!.surah > 0;
  return (
    <div className="flex flex-col gap-2">
      {item.basmalah ? (
        <ArabicText source="quran" className="text-center text-[22px] text-haram-deep">
          {BASMALAH}
        </ArabicText>
      ) : null}
      <ArabicText source={quran ? "quran" : "hadith"} className={className}>
        {item.verses.map((v) => (
          <span key={v.ref}>
            {v.arabic}
            {quran ? (
              <span className="mx-1 text-saffron-deep">
                {" "}
                {AYAH_END}
                {arabicNumber(v.ayah)}{" "}
              </span>
            ) : null}
          </span>
        ))}
      </ArabicText>
    </div>
  );
}

/** Calligraphic ornament: the first word of the talbiyah in Kufi. Decorative only. */
export function LabbaikOrnament({ className = "" }: { className?: string }) {
  return (
    <span lang="ar" dir="rtl" aria-hidden="true" className={`font-kufi leading-none select-none ${className}`}>
      {LABBAIK}
    </span>
  );
}

/** A divider made of the khatam star and the rub el hizb sign. */
export function StarDivider({ className = "text-saffron" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-current opacity-40" />
      <Khatam className="h-4 w-4" strokeWidth={8} />
      <span className="font-quran text-lg leading-none">{RUB_EL_HIZB}</span>
      <Khatam className="h-4 w-4" strokeWidth={8} />
      <span className="h-px flex-1 bg-current opacity-40" />
    </div>
  );
}

export function QuranAttribution({ locale }: { locale: Locale }) {
  return (
    <a href={QURAN_ATTRIBUTION.url} target="_blank" rel="noopener" className="text-[11px] text-ink-3 hover:underline">
      {locale === "bn" ? "আরবি: Tanzil (tanzil.net)" : "Arabic: Tanzil (tanzil.net)"}
    </a>
  );
}
