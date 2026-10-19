"use client";

import { useMutation } from "@tanstack/react-query";
import type { SectionSetting } from "@hajj/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { CheckIcon, ChevronIcon } from "@/components/icons";
import { Button, Card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

/** Show or hide each part of the website and put them in order. The top banner always comes first. */
export function SectionsForm({ initial }: { initial: SectionSetting[] }) {
  const t = useTranslations("website.sections");
  const trpc = useTRPC();
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [saved, setSaved] = useState(false);
  const save = useMutation(trpc.website.saveSections.mutationOptions({ onSuccess: () => (setSaved(true), router.refresh()) }));

  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setList(next);
    setSaved(false);
  };

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-[14px] text-ink-3">{t("hint")}</p>
      </div>
      <ol className="flex flex-col gap-2">
        <li className="flex items-center gap-3 rounded-md bg-ground px-4 py-3 text-[15px] text-ink-3">
          <span className="w-6 text-center font-bold">•</span>
          {t("names.hero")} · {t("alwaysFirst")}
        </li>
        {list.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-3 rounded-md border px-4 py-2.5 ${s.visible ? "border-line bg-paper" : "border-dashed border-line-strong bg-ground"}`}>
            <span className="w-6 text-center font-bold text-ink-3">{i + 1}</span>
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={s.visible}
                onChange={(e) => {
                  setList(list.map((x) => (x.id === s.id ? { ...x, visible: e.target.checked } : x)));
                  setSaved(false);
                }}
                className="h-5 w-5 accent-haram"
              />
              <span className="flex min-w-0 flex-col">
                <b className={`text-[15px] ${s.visible ? "" : "text-ink-3 line-through"}`}>{t(`names.${s.id}`)}</b>
                <span className="text-[13px] text-ink-3">{t(`about.${s.id}`)}</span>
              </span>
            </label>
            <div className="flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("up", { name: t(`names.${s.id}`) })} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                <ChevronIcon dir="left" size={18} className="rotate-90" />
              </button>
              <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={t("down", { name: t(`names.${s.id}`) })} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                <ChevronIcon dir="right" size={18} className="rotate-90" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-ink-3">{t("emptyNote")}</p>
      <FormError error={save.error} />
      <div className="flex items-center gap-3">
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate({ sections: list })}>
          {t("save")}
        </Button>
        {saved ? (
          <span role="status" className="flex items-center gap-1.5 font-semibold text-paid">
            <CheckIcon size={18} />
            {t("saved")}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
