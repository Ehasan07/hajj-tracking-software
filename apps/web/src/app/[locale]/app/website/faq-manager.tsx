"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { ChevronIcon, PlusIcon } from "@/components/icons";
import { Button, Card, EmptyState, Field, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export interface FaqRow {
  id: string;
  questionBn: string;
  questionEn: string | null;
  answerBn: string;
  answerEn: string | null;
}

function FaqEditor({ faq, onDone }: { faq?: FaqRow; onDone: () => void }) {
  const t = useTranslations("website.faq");
  const trpc = useTRPC();
  const router = useRouter();
  const [english, setEnglish] = useState(Boolean(faq?.questionEn || faq?.answerEn));
  const save = useMutation(trpc.website.saveFaq.mutationOptions({ onSuccess: () => (router.refresh(), onDone()) }));
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    save.mutate({ id: faq?.id, questionBn: s("questionBn"), answerBn: s("answerBn"), questionEn: s("questionEn") || undefined, answerEn: s("answerEn") || undefined });
  }
  const p = faq?.id ?? "new";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field id={`fq-q-${p}`} name="questionBn" required minLength={3} maxLength={300} defaultValue={faq?.questionBn} label={t("question")} placeholder={t("questionPlaceholder")} />
      <TextAreaField id={`fq-a-${p}`} name="answerBn" required minLength={3} maxLength={3000} defaultValue={faq?.answerBn} label={t("answer")} className="min-h-28" />
      {english ? (
        <>
          <Field id={`fq-qe-${p}`} name="questionEn" maxLength={300} defaultValue={faq?.questionEn ?? ""} label={t("questionEn")} />
          <TextAreaField id={`fq-ae-${p}`} name="answerEn" maxLength={3000} defaultValue={faq?.answerEn ?? ""} label={t("answerEn")} className="min-h-24" />
        </>
      ) : (
        <button type="button" onClick={() => setEnglish(true)} className="self-start text-[14px] font-semibold text-haram underline underline-offset-4">
          {t("addEnglish")}
        </button>
      )}
      <FormError error={save.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {t("save")}
        </Button>
        <Button type="button" variant="quiet" onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

export function FaqManager({ faqs }: { faqs: FaqRow[] }) {
  const t = useTranslations("website.faq");
  const trpc = useTRPC();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const move = useMutation(trpc.website.moveFaq.mutationOptions({ onSuccess: () => router.refresh() }));
  const remove = useMutation(trpc.website.deleteFaq.mutationOptions({ onSuccess: () => router.refresh() }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-ink-3">{t("hint")}</p>
        {editing !== "new" ? (
          <Button type="button" onClick={() => setEditing("new")}>
            <PlusIcon size={18} />
            {t("new")}
          </Button>
        ) : null}
      </div>
      {editing === "new" ? (
        <Card className="p-6">
          <FaqEditor onDone={() => setEditing(null)} />
        </Card>
      ) : null}
      <FormError error={move.error ?? remove.error} />
      {faqs.length === 0 && editing !== "new" ? (
        <Card>
          <EmptyState title={t("empty")} body={t("emptyBody")} />
        </Card>
      ) : null}
      {faqs.map((f, i) => (
        <Card key={f.id} className="flex flex-col gap-3 p-5">
          {editing === f.id ? (
            <FaqEditor faq={f} onDone={() => setEditing(null)} />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-haram-tint text-[13px] font-bold text-haram-deep">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="text-[16px]">{f.questionBn}</b>
                  <p className="line-clamp-2 text-[14px] text-ink-2">{f.answerBn}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-10">
                <button type="button" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: f.id, dir: "up" })} aria-label={t("up")} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                  <ChevronIcon dir="left" size={18} className="rotate-90" />
                </button>
                <button type="button" disabled={i === faqs.length - 1 || move.isPending} onClick={() => move.mutate({ id: f.id, dir: "down" })} aria-label={t("down")} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                  <ChevronIcon dir="right" size={18} className="rotate-90" />
                </button>
                <Button type="button" variant="outline" className="h-9 px-3 text-[13px]" onClick={() => setEditing(f.id)}>
                  {t("edit")}
                </Button>
                <Button type="button" variant="danger" className="h-9 px-3 text-[13px]" onClick={() => window.confirm(t("confirmDelete")) && remove.mutate({ id: f.id })}>
                  {t("delete")}
                </Button>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
