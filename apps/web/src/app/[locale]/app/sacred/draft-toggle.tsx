"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

/** Owner's switch: may the public website show draft meanings before approval? */
export function DraftToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("sacred");
  const trpc = useTRPC();
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const save = useMutation(
    trpc.tenant.updateSettings.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: () => setOn((v) => !v),
    }),
  );

  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-lg bg-paper p-5">
      <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={save.isPending}
          onChange={(e) => {
            setOn(e.target.checked);
            save.mutate({ showDraftMeanings: e.target.checked });
          }}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-haram peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-haram" />
        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-paper shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="flex flex-col gap-1">
        <b className="text-[16px]">{t("showDrafts")}</b>
        <span className="text-[14px] leading-relaxed text-ink-3">{t("showDraftsHint")}</span>
      </span>
    </label>
  );
}
