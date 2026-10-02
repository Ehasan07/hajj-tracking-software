"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { CheckIcon } from "@/components/icons";
import { Button, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

interface Props {
  contentId: string;
  meaningBn: string[];
  meaningEn: string[];
  pronunciation?: string | null;
  status?: "approved" | "changes_requested";
}

export function ReviewControls({ contentId, meaningBn, meaningEn, pronunciation, status }: Props) {
  const t = useTranslations("sacred");
  const trpc = useTRPC();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "changes">("idle");
  const [bn, setBn] = useState(meaningBn);
  const [en, setEn] = useState(meaningEn);
  const [pron, setPron] = useState(pronunciation ?? "");
  const [note, setNote] = useState("");
  const review = useMutation(
    trpc.sacred.review.mutationOptions({
      onSuccess: () => {
        setMode("idle");
        router.refresh();
      },
    }),
  );

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {status !== "approved" ? (
          <Button
            type="button"
            className="h-10 px-4 text-sm"
            disabled={review.isPending}
            onClick={() => review.mutate({ contentId, status: "approved" })}
          >
            <CheckIcon size={16} />
            {t("approve")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="h-10 px-4 text-sm" onClick={() => setMode("edit")}>
          {t("edit")}
        </Button>
        <Button type="button" variant="quiet" className="h-10 px-2 text-sm" onClick={() => setMode("changes")}>
          {t("requestChanges")}
        </Button>
        <FormError error={review.error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md bg-ground p-4">
      {mode === "edit" ? (
        <>
          {bn.map((value, i) => (
            <TextAreaField
              key={`bn-${i}`}
              id={`${contentId}-bn-${i}`}
              lang="bn"
              label={`${t("meaning")} (বাংলা)${bn.length > 1 ? ` ${i + 1}` : ""}`}
              value={value}
              onChange={(e) => setBn(bn.map((v, j) => (j === i ? e.target.value : v)))}
              className="min-h-20 bg-paper"
            />
          ))}
          {en.map((value, i) => (
            <TextAreaField
              key={`en-${i}`}
              id={`${contentId}-en-${i}`}
              lang="en"
              label={`${t("meaning")} (English)${en.length > 1 ? ` ${i + 1}` : ""}`}
              value={value}
              onChange={(e) => setEn(en.map((v, j) => (j === i ? e.target.value : v)))}
              className="min-h-20 bg-paper"
            />
          ))}
          {pronunciation !== undefined && pronunciation !== null ? (
            <TextAreaField
              id={`${contentId}-pron`}
              lang="bn"
              label={t("pronunciation")}
              value={pron}
              onChange={(e) => setPron(e.target.value)}
              className="min-h-20 bg-paper"
            />
          ) : null}
        </>
      ) : null}
      <TextAreaField
        id={`${contentId}-note`}
        label={t("reviewerNote")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-16 bg-paper"
      />
      <FormError error={review.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "edit" ? "primary" : "danger"}
          className="h-10 px-4 text-sm"
          disabled={review.isPending || (mode === "changes" && note.trim().length < 3)}
          onClick={() =>
            review.mutate({
              contentId,
              status: mode === "edit" ? "approved" : "changes_requested",
              meaningBn: mode === "edit" ? bn : [],
              meaningEn: mode === "edit" ? en : [],
              pronunciation: mode === "edit" ? pron : undefined,
              reviewerNote: note,
            })
          }
        >
          {mode === "edit" ? t("saveApprove") : t("requestChanges")}
        </Button>
        <Button type="button" variant="quiet" className="h-10 px-2 text-sm" onClick={() => setMode("idle")}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
