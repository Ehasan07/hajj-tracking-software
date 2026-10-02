import type { ResolvedItem } from "@hajj/sacred";
import type { Locale } from "./format";

export interface Review {
  status: "approved" | "changes_requested";
  meaningBn: string[];
  meaningEn: string[];
  pronunciation: string | null;
  reviewerNote: string | null;
}

/** The text to show for an item: the scholar's wording if they rewrote it, otherwise the draft. */
export function presented(item: ResolvedItem, review: Review | undefined, locale: Locale) {
  const rewritten = locale === "bn" ? review?.meaningBn : review?.meaningEn;
  const meanings = item.verses.map((v, i) => (rewritten && rewritten.length ? rewritten[i]! : v.meaning[locale]));
  return {
    approved: review?.status === "approved",
    meanings,
    pronunciation: review?.pronunciation ?? item.pronunciation ?? null,
  };
}
