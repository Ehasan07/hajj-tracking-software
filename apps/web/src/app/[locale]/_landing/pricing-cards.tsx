"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, money, type Locale } from "@/lib/format";

export interface PriceCard {
  code: string;
  name: string;
  tagline: string;
  /** Paisa. */
  priceMonthly: number;
  priceYearly: number;
  pilgrims: number | null;
  staff: number | null;
  /** Left out where the server can't send SMS, so it isn't promised. */
  sms?: number | null;
}

/** The plans, monthly or yearly; the yearly saving is worked out from the two prices, not typed in. */
export function PricingCards({ plans, featured }: { plans: PriceCard[]; featured: string }) {
  const t = useTranslations("landing.pricing");
  const locale = useLocale() as Locale;
  const [yearly, setYearly] = useState(false);
  const best = Math.max(...plans.map((p) => saving(p)));
  const limit = (n: number | null | undefined) => (n == null ? t("unlimited") : digits(n, locale));

  return (
    <div className="flex flex-col gap-8">
      <div role="radiogroup" aria-label={t("billing")} className="flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {[false, true].map((y) => (
          <button
            key={String(y)}
            type="button"
            role="radio"
            aria-checked={yearly === y}
            onClick={() => setYearly(y)}
            className={`flex h-10 items-center gap-2 rounded-sm px-4 text-[15px] font-semibold transition-colors ${yearly === y ? "bg-haram text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {y ? t("yearlyTab") : t("monthlyTab")}
            {y && best > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-[12px] ${yearly ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                {t("upTo", { pct: digits(best, locale) })}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const isFeatured = p.code === featured;
          const pct = saving(p);
          return (
            <article
              key={p.code}
              className={`flex flex-col gap-5 rounded-xl border bg-white p-6 shadow-sm ${isFeatured ? "border-haram ring-1 ring-haram" : "border-slate-200"}`}
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                {p.tagline ? <p className="text-[14px] text-slate-500">{p.tagline}</p> : null}
              </div>
              <div className="flex flex-col gap-1">
                <p className="flex items-baseline gap-1.5">
                  <b className="tabular text-4xl text-slate-900">{money(yearly ? p.priceYearly : p.priceMonthly, locale)}</b>
                  <span className="text-[15px] text-slate-500">{yearly ? t("perYear") : t("perMonth")}</span>
                </p>
                <p className="min-h-[22px] text-[14px] text-slate-600">
                  {yearly ? (
                    <>
                      {t("monthlyEquivalent", { price: money(Math.round(p.priceYearly / 12 / 100) * 100, locale) })}
                      {pct > 0 ? <span className="ml-2 font-semibold text-emerald-700">{t("save", { pct: digits(pct, locale) })}</span> : null}
                    </>
                  ) : (
                    t("yearly", { price: money(p.priceYearly, locale) })
                  )}
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-[15px] text-slate-700">
                <li>{t("pilgrims", { n: limit(p.pilgrims) })}</li>
                <li>{t("staff", { n: limit(p.staff) })}</li>
                {p.sms !== undefined ? <li>{t("sms", { n: limit(p.sms) })}</li> : null}
                <li>{t("included")}</li>
              </ul>
              <Link href="/sign-up" className={isFeatured ? buttonClass("primary", "mt-auto w-full !rounded-xl") : buttonClass("outline", "mt-auto w-full !rounded-xl border-slate-300")}>
                {t("cta")}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Percent saved by paying for the year at once, rounded down. */
function saving(p: PriceCard): number {
  const full = p.priceMonthly * 12;
  return full > 0 && p.priceYearly < full ? Math.floor(((full - p.priceYearly) / full) * 100) : 0;
}
