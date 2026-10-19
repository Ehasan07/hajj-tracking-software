"use client";

import { THEME_KEYS, THEMES, themeFromColor, type ThemeKey } from "@hajj/core";
import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { Khatam } from "@/components/ui";
import type { Locale } from "@/lib/format";

/**
 * A small agency website in a browser frame. Picking a colour repaints it,
 * the way an agency's own site changes when it picks a theme in the software.
 */
export function ThemeDemo() {
  const t = useTranslations("landing.website.demo");
  const locale = useLocale() as Locale;
  const [key, setKey] = useState<ThemeKey>("zamzam");
  const c = themeFromColor(THEMES[key].primary);
  const vars = { "--d-primary": c.primary, "--d-night": c.night, "--d-tint": c.tint, "--d-raised": c.nightRaised, "--d-muted": c.nightMuted } as CSSProperties;

  return (
    <div className="flex flex-col gap-4">
      <div style={vars} className="overflow-hidden rounded-[18px] border border-line bg-paper shadow-[0_40px_70px_-45px_rgb(18_48_46/0.55)]">
        <div className="flex items-center gap-2 border-b border-line bg-ground px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="ml-2 truncate rounded-md bg-paper px-3 py-1 text-[12px] text-ink-3">hajj.takatracker.com/site/al-madina</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-6 items-center justify-center rounded-[12px_12px_5px_5px] transition-colors duration-500" style={{ background: "var(--d-primary)" }}>
              <Khatam className="h-4 w-4 text-saffron" strokeWidth={8} />
            </span>
            <b className="text-[14px]">{t("agency")}</b>
          </span>
          <span className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-colors duration-500" style={{ background: "var(--d-primary)" }}>
            {t("cta")}
          </span>
        </div>
        <div className="grid gap-4 px-5 pt-2 pb-5 sm:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="font-display text-[26px] leading-tight">{t("headline")}</p>
            <p className="text-[12px] leading-relaxed text-ink-2">{t("body")}</p>
          </div>
          <div className="aspect-[4/3] rounded-[60px_60px_10px_10px] transition-colors duration-500" style={{ background: "var(--d-night)" }}>
            <div className="flex h-full items-end justify-center pb-4">
              <span className="block h-12 w-10 rounded-sm bg-[#1d1d1b] shadow-[inset_0_4px_0_#d6a43a]" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 pb-5">
          {["economy", "standard", "premium"].map((p, i) => (
            <div
              key={p}
              className="flex flex-col items-center gap-1 rounded-[40px_40px_8px_8px] px-2 pt-4 pb-3 text-center transition-colors duration-500"
              style={i === 1 ? { background: "var(--d-night)", color: "#fff" } : { background: "var(--d-tint)" }}
            >
              <span className="text-[11px] font-semibold">{t(`packages.${p}`)}</span>
              <b className="text-[13px] tabular" style={i === 1 ? { color: "var(--color-saffron)" } : { color: "var(--d-primary)" }}>
                {t(`prices.${p}`)}
              </b>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 text-[12px] transition-colors duration-500" style={{ background: "var(--d-night)", color: "var(--d-muted)" }}>
          “{t("review")}”
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-ink-2">{t("pick")}</legend>
        <div className="flex flex-wrap gap-2">
          {THEME_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={key === k}
              onClick={() => setKey(k)}
              className={`flex items-center gap-2 rounded-full border-[1.5px] py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold transition-colors ${
                key === k ? "border-ink bg-paper" : "border-line bg-paper/60 text-ink-2 hover:border-line-strong"
              }`}
            >
              <span className="h-6 w-6 rounded-full" style={{ background: THEMES[k].primary }} aria-hidden="true" />
              {THEMES[k][locale]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
