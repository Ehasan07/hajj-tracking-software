"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useActionState, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, Field, TextAreaField } from "@/components/ui";
import { submitReview, type ReviewState } from "./actions";

export function Stars({ value, size = 18, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={n <= Math.round(value) ? "text-saffron" : "text-line-strong"}>
          <path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** "Share your experience": lands with the agency for approval before it shows. */
export function ReviewForm({ site }: { site?: string }) {
  const tp = useTranslations("privacy");
  const t = useTranslations("site.reviews");
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { status: "idle" });
  const v = state.status === "error" ? state.values : {};
  const [rating, setRating] = useState(Number(v.rating ?? 5));

  if (state.status === "ok") {
    return (
      <div role="status" className="flex animate-rise flex-col items-center gap-4 rounded-lg bg-paid-tint px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paid text-white">
          <CheckIcon size={28} />
        </span>
        <p className="max-w-sm text-[17px] font-semibold text-paid">{t("thanks")}</p>
      </div>
    );
  }

  return (
    <form key={state.status === "error" ? JSON.stringify(v) : "fresh"} action={action} className="grid gap-4 sm:grid-cols-2">
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-semibold">{t("rating")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-md p-1 focus-within:ring-2 focus-within:ring-haram">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">{t("stars", { n })}</span>
              <svg width={34} height={34} viewBox="0 0 24 24" aria-hidden="true" className={`transition-colors ${n <= rating ? "text-saffron" : "text-line-strong hover:text-saffron/60"}`}>
                <path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="rv-name" name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={v.name} label={t("name")} />
      <Field id="rv-place" name="place" maxLength={80} defaultValue={v.place} label={t("place")} placeholder={t("placeHint")} />
      <div className="sm:col-span-2">
        <Field id="rv-trip" name="trip" maxLength={80} defaultValue={v.trip} label={t("trip")} placeholder={t("tripHint")} />
      </div>
      <div className="sm:col-span-2">
        <TextAreaField id="rv-body" name="body" required minLength={10} maxLength={1000} defaultValue={v.body} label={t("body")} className="min-h-28" />
      </div>
      {site ? <input type="hidden" name="site" value={site} /> : null}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="rv-website">Website</label>
        <input id="rv-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.status === "error" ? (
        <p role="alert" className="rounded-md bg-due-tint px-4 py-3 text-[15px] font-semibold text-due sm:col-span-2">
          {t(`errors.${state.code}`)}
        </p>
      ) : null}
      <p className="text-[13px] text-ink-3 sm:col-span-2">{t("moderated")}</p>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? t("sending") : t("submit")}
      </Button>
      <p className="text-[13px] text-[var(--site-ink-3,var(--color-ink-3))] sm:col-span-2">
        {tp.rich("formNote", { link: (c) => <Link href="/privacy" className="underline underline-offset-4">{c}</Link> })}
      </p>
    </form>
  );
}
