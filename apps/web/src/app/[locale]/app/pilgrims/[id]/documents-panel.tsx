"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FormError, useErrorText } from "@/components/form-error";
import { CheckIcon, UploadIcon } from "@/components/icons";
import { Badge, Button, buttonClass, Field, Spinner, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { dateText, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

export interface DocTypeView {
  code: string;
  name: { bn: string; en: string };
  hint: { bn: string; en: string };
  required: boolean;
  imageOnly?: boolean;
  hasExpiry?: boolean;
}

export interface DocView {
  id: string;
  type: string;
  contentType: string;
  status: "received" | "verified" | "rejected";
  note: string | null;
  expiresOn: string | null;
  uploadedAt: Date | string;
}

const TONE = { received: "pending", verified: "paid", rejected: "due" } as const;

function UploadButtons({ pilgrimId, type, imageOnly, label }: { pilgrimId: string; type: string; imageOnly?: boolean; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.append("type", type);
    body.append("file", file);
    const res = await fetch(`/api/files/pilgrim/${pilgrimId}`, { method: "POST", body });
    setBusy(false);
    if (!res.ok) {
      const { error: code } = (await res.json().catch(() => ({ error: "generic" }))) as { error: string };
      setError(errorText(new Error(code)));
      return;
    }
    router.refresh();
  }

  const accept = imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf";
  const input = (capture: boolean) => (
    <input
      type="file"
      accept={capture ? "image/*" : accept}
      {...(capture ? { capture: "environment" as const } : {})}
      className="sr-only"
      disabled={busy}
      aria-label={`${label}: ${capture ? t("docs.camera") : t("docs.upload")}`}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <label className={buttonClass("outline", "h-10 cursor-pointer px-3 text-sm")}>
          {busy ? <Spinner label={t("docs.uploading")} className="h-4 w-4" /> : <UploadIcon size={18} accent="var(--color-haram)" />}
          {t("docs.upload")}
          {input(false)}
        </label>
        <label className={buttonClass("quiet", "h-10 cursor-pointer px-2 text-sm sm:hidden")}>
          {t("docs.camera")}
          {input(true)}
        </label>
      </div>
      {error ? <p role="alert" className="text-[13px] font-semibold text-due">{error}</p> : null}
    </div>
  );
}

function ReviewActions({ doc, hasExpiry }: { doc: DocView; hasExpiry?: boolean }) {
  const t = useTranslations("docs");
  const trpc = useTRPC();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "verify" | "reject">("idle");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState(doc.expiresOn ?? "");
  const review = useMutation(trpc.documents.review.mutationOptions({ onSuccess: () => router.refresh() }));

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10 px-3 text-sm"
          onClick={() => (hasExpiry ? setMode("verify") : review.mutate({ id: doc.id, status: "verified" }))}
          disabled={review.isPending}
        >
          <CheckIcon size={16} />
          {t("verify")}
        </Button>
        <Button type="button" variant="danger" className="h-10 px-3 text-sm" onClick={() => setMode("reject")}>
          {t("reject")}
        </Button>
        <FormError error={review.error} />
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-ground p-3">
      {mode === "verify" ? (
        <Field id={`exp-${doc.id}`} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} label={t("expiry")} className="bg-paper" />
      ) : (
        <TextAreaField id={`why-${doc.id}`} value={note} onChange={(e) => setNote(e.target.value)} label={t("reason")} className="min-h-16 bg-paper" />
      )}
      <FormError error={review.error} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "verify" ? "primary" : "danger"}
          className="h-10 px-4 text-sm"
          disabled={review.isPending || (mode === "reject" && note.trim().length < 3)}
          onClick={() =>
            review.mutate(
              mode === "verify"
                ? { id: doc.id, status: "verified", expiresOn: expiry || undefined }
                : { id: doc.id, status: "rejected", note },
            )
          }
        >
          {mode === "verify" ? t("verify") : t("reject")}
        </Button>
        <Button type="button" variant="quiet" className="h-10 px-2 text-sm" onClick={() => setMode("idle")}>
          ✕
        </Button>
      </div>
    </div>
  );
}

export function DocumentsPanel({
  pilgrimId,
  types,
  documents,
  canReview,
}: {
  pilgrimId: string;
  types: DocTypeView[];
  documents: DocView[];
  canReview: boolean;
}) {
  const t = useTranslations("docs");
  const locale = useLocale() as Locale;

  return (
    <ul className="flex flex-col">
      {types.map((type) => {
        const all = documents.filter((d) => d.type === type.code);
        const latest = all[0];
        const status = latest?.status;
        return (
          <li key={type.code} className="flex flex-col gap-3 border-t border-[#eef3f2] py-4 first:border-t-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    status === "verified" ? "bg-paid text-white" : status === "rejected" ? "bg-due-tint text-due" : status ? "bg-saffron-tint text-saffron-ink" : "border-2 border-dashed border-line-strong"
                  }`}
                >
                  {status === "verified" ? <CheckIcon size={14} /> : status === "rejected" ? "!" : null}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-[15px]">{type.name[locale]}</b>
                    <span className={`text-[11px] font-semibold ${type.required ? "text-due" : "text-ink-3"}`}>
                      {type.required ? t("required") : t("optional")}
                    </span>
                  </span>
                  <span className="text-[13px] text-ink-3">{type.hint[locale]}</span>
                </div>
              </div>
              <Badge tone={status ? TONE[status] : "neutral"}>{status ? t(status) : t("missing")}</Badge>
            </div>

            {latest ? (
              <div className="flex flex-wrap items-center gap-3 ps-10">
                {latest.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/document/${latest.id}`}
                    alt={type.name[locale]}
                    loading="lazy"
                    className="h-16 w-16 rounded-md border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md border border-line bg-ground font-mono text-xs text-ink-3">PDF</span>
                )}
                <div className="flex flex-col gap-1 text-[13px] text-ink-3">
                  <a href={`/api/files/document/${latest.id}`} target="_blank" rel="noopener" className="font-semibold text-haram underline underline-offset-4">
                    {t("view")}
                  </a>
                  <span>{dateText(latest.uploadedAt, locale, true)}</span>
                  {latest.expiresOn ? (
                    <span>
                      {t("expiry")}: {dateText(latest.expiresOn, locale)}
                    </span>
                  ) : null}
                  {latest.status === "rejected" && latest.note ? <span className="font-semibold text-due">{latest.note}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 ps-10">
              {canReview && latest?.status === "received" ? <ReviewActions doc={latest} hasExpiry={type.hasExpiry} /> : null}
              {!latest || latest.status === "rejected" || type.code === "other" ? (
                <UploadButtons pilgrimId={pilgrimId} type={type.code} imageOnly={type.imageOnly} label={type.name[locale]} />
              ) : latest.status === "verified" ? (
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-ink-3">{t("reupload")}</summary>
                  <div className="pt-2">
                    <UploadButtons pilgrimId={pilgrimId} type={type.code} imageOnly={type.imageOnly} label={type.name[locale]} />
                  </div>
                </details>
              ) : null}
            </div>

            {all.length > 1 ? (
              <details className="ps-10 text-[13px] text-ink-3">
                <summary className="cursor-pointer">
                  {t("history")} ({all.length - 1})
                </summary>
                <ul className="flex flex-col gap-1 pt-2">
                  {all.slice(1).map((d) => (
                    <li key={d.id} className="flex flex-wrap gap-2">
                      <a href={`/api/files/document/${d.id}`} target="_blank" rel="noopener" className="text-haram underline">
                        {dateText(d.uploadedAt, locale, true)}
                      </a>
                      <span>· {t(d.status)}</span>
                      {d.note ? <span>· {d.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
