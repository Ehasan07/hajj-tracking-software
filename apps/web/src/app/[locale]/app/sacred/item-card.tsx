import { getTranslations } from "next-intl/server";
import type { ResolvedItem } from "@hajj/sacred";
import { QuranAttribution, Verses } from "@/components/sacred";
import { Badge } from "@/components/ui";
import { digits, type Locale } from "@/lib/format";
import { presented, type Review } from "@/lib/sacred";
import { ReviewControls } from "./review-controls";

export function ReviewBadge({ review, t }: { review?: Review; t: (k: string) => string }) {
  if (review?.status === "approved") return <Badge tone="paid">{t("approved")}</Badge>;
  if (review?.status === "changes_requested") return <Badge tone="due">{t("changes")}</Badge>;
  return <Badge tone="pending">{t("draft")}</Badge>;
}

export async function ItemCard({
  item,
  review,
  locale,
  canReview,
  compact = false,
}: {
  item: ResolvedItem;
  review?: Review;
  locale: Locale;
  canReview: boolean;
  compact?: boolean;
}) {
  const t = await getTranslations("sacred");
  const shown = presented(item, review, locale);
  const quran = item.verses[0]!.surah > 0;
  const draftOrApproved = shown.approved ? "" : "border-l-4 border-saffron pl-4";

  return (
    <article
      id={item.id}
      className={`flex scroll-mt-24 flex-col gap-4 bg-paper ${compact ? "rounded-md border border-line p-4" : "rounded-[48px_48px_20px_20px] p-6 sm:p-8"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className={compact ? "text-base font-bold" : "text-lg font-bold"}>{item.title[locale]}</h3>
          <span className="text-[13px] text-ink-3">{item.citation[locale]}</span>
        </div>
        <ReviewBadge review={review} t={t} />
      </header>

      <div className="rounded-[28px_28px_14px_14px] bg-[radial-gradient(circle_at_top,var(--color-haram-tint),transparent_70%)] px-2 py-3 sm:px-5">
        <Verses item={item} className={compact ? "text-[22px]" : "text-[28px] sm:text-[32px]"} />
      </div>

      {shown.pronunciation ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-3">{t("pronunciation")}</span>
          <p className="text-[16px] leading-relaxed text-ink-2 italic">{shown.pronunciation}</p>
        </div>
      ) : null}

      <div className={`flex flex-col gap-1.5 ${draftOrApproved}`}>
        <span className="text-xs font-semibold text-ink-3">{t("meaning")}</span>
        {shown.meanings.map((m, i) => (
          <p key={i} className="text-[16px] leading-relaxed">
            {quran && shown.meanings.length > 1 ? (
              <span className="mr-1.5 font-semibold text-haram">{digits(item.verses[i]!.ayah, locale)}.</span>
            ) : null}
            {m}
          </p>
        ))}
      </div>

      {item.when && !compact ? (
        <p className="rounded-md bg-haram-tint/60 px-4 py-3 text-[15px]">
          <b className="font-semibold">{t("when")}: </b>
          {item.when[locale]}
        </p>
      ) : null}
      {item.note && !compact ? (
        <p className="text-[14px] text-ink-2">
          <b className="font-semibold">{t("note")}: </b>
          {item.note[locale]}
        </p>
      ) : null}
      {review?.reviewerNote ? (
        <p className="rounded-md bg-ground px-4 py-3 text-[14px]">
          <b className="font-semibold">{t("reviewerNote")}: </b>
          {review.reviewerNote}
        </p>
      ) : null}
      {canReview && item.hadithCorrections.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-md bg-saffron-tint px-4 py-3 text-[14px] text-saffron-ink">
          <span className="font-semibold">{t("correction")}</span>
          {item.hadithCorrections.map((c) => (
            <span key={c.from} className="flex flex-wrap items-center gap-2">
              <span lang="ar" dir="rtl" className="font-naskh text-xl line-through">
                {c.from}
              </span>
              →
              <span lang="ar" dir="rtl" className="font-naskh text-xl font-bold">
                {c.to}
              </span>
              <span className="text-[13px]">{c.note}</span>
            </span>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-3">
        {canReview ? (
          <ReviewControls
            contentId={`item:${item.id}`}
            status={review?.status}
            meaningBn={presented(item, review, "bn").meanings}
            meaningEn={presented(item, review, "en").meanings}
            pronunciation={item.pronunciation ? shown.pronunciation : null}
          />
        ) : (
          <span />
        )}
        {quran ? <QuranAttribution locale={locale} /> : null}
      </footer>
    </article>
  );
}
