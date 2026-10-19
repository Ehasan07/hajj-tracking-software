"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { Badge, Button, Card, EmptyState, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { dateText, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";
import { Stars } from "../../_site/review-form";

export interface ReviewRow {
  id: string;
  name: string;
  place: string | null;
  trip: string | null;
  rating: number;
  body: string;
  source: string;
  status: string;
  createdAt: Date;
}

type Filter = "pending" | "approved" | "hidden";

function AddReview({ onDone }: { onDone: () => void }) {
  const t = useTranslations("website.reviews");
  const trpc = useTRPC();
  const router = useRouter();
  const add = useMutation(trpc.website.addReview.mutationOptions({ onSuccess: () => (router.refresh(), onDone()) }));
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    add.mutate({ name: s("name"), place: s("place") || undefined, trip: s("trip") || undefined, rating: Number(s("rating")), body: s("body") });
  }
  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">{t("addTitle")}</h2>
        <p className="-mt-2 text-[14px] text-ink-3 sm:col-span-2">{t("addHint")}</p>
        <Field id="ar-name" name="name" required minLength={2} maxLength={80} label={t("name")} />
        <SelectField id="ar-rating" name="rating" defaultValue="5" label={t("rating")}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </SelectField>
        <Field id="ar-place" name="place" maxLength={80} label={t("place")} />
        <Field id="ar-trip" name="trip" maxLength={80} label={t("trip")} />
        <div className="sm:col-span-2">
          <TextAreaField id="ar-body" name="body" required minLength={10} maxLength={1000} label={t("body")} className="min-h-28" />
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <FormError error={add.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={add.isPending}>
              {t("addSave")}
            </Button>
            <Button type="button" variant="quiet" onClick={onDone}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

/** Reviews sent from the website wait here; only approved ones show on the site. */
export function ReviewsManager({ reviews }: { reviews: ReviewRow[] }) {
  const t = useTranslations("website.reviews");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const pending = reviews.filter((r) => r.status === "pending").length;
  const [filter, setFilter] = useState<Filter>(pending > 0 ? "pending" : "approved");
  const [adding, setAdding] = useState(false);
  const setStatus = useMutation(trpc.website.setReviewStatus.mutationOptions({ onSuccess: () => router.refresh() }));
  const remove = useMutation(trpc.website.deleteReview.mutationOptions({ onSuccess: () => router.refresh() }));
  const shown = reviews.filter((r) => r.status === filter);

  if (adding) return <AddReview onDone={() => setAdding(false)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("filter")} className="flex gap-1 rounded-lg bg-ground p-1">
          {(["pending", "approved", "hidden"] as const).map((f) => {
            const n = reviews.filter((r) => r.status === f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-4 py-2 text-[14px] font-semibold ${filter === f ? "bg-paper shadow-sm" : "text-ink-2 hover:text-ink"}`}
              >
                {t(`status.${f}`)} ({n})
              </button>
            );
          })}
        </div>
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          {t("add")}
        </Button>
      </div>
      <FormError error={setStatus.error ?? remove.error} />
      {shown.length === 0 ? (
        <Card>
          <EmptyState title={t(`empty.${filter}`)} body={filter === "pending" ? t("emptyBody") : undefined} />
        </Card>
      ) : (
        shown.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} />
              <b>{r.name}</b>
              <span className="text-[13px] text-ink-3">{[r.place, r.trip, dateText(r.createdAt, locale)].filter(Boolean).join(" · ")}</span>
              <Badge tone={r.source === "website" ? "info" : "neutral"}>{t(`source.${r.source as "website" | "office"}`)}</Badge>
            </div>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{r.body}</p>
            <div className="flex flex-wrap gap-2">
              {r.status !== "approved" ? (
                <Button type="button" className="h-10 px-4 text-[14px]" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}>
                  {t("approve")}
                </Button>
              ) : null}
              {r.status !== "hidden" ? (
                <Button type="button" variant="outline" className="h-10 px-4 text-[14px]" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: r.id, status: "hidden" })}>
                  {t("hide")}
                </Button>
              ) : null}
              <Button type="button" variant="danger" className="h-10 px-4 text-[14px]" disabled={remove.isPending} onClick={() => window.confirm(t("confirmDelete")) && remove.mutate({ id: r.id })}>
                {t("delete")}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
