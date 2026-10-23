"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

const NAME_KEY = "hajj.admin.reciter";

/** Upload, hear, replace or remove one item's recording. */
export function RecordingRow({ itemId, current }: { itemId: string; current: { reciter: string; url: string } | null }) {
  const t = useTranslations("admin.recordings");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(!current);
  const [defaultName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      localStorage.setItem(NAME_KEY, String(form.get("reciter") ?? ""));
    } catch {
      /* not remembered */
    }
    const res = await fetch(`/api/admin/recordings/${itemId}`, { method: "POST", body: form });
    setPending(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const known = ["UNSUPPORTED_TYPE", "TOO_LARGE", "NO_FILE"];
    setError(t(`errors.${known.includes(body.error ?? "") ? body.error : "generic"}`));
  }

  async function remove() {
    if (!window.confirm(t("confirmRemove"))) return;
    setPending(true);
    await fetch(`/api/admin/recordings/${itemId}`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      {current ? (
        <div className="flex flex-wrap items-center gap-3">
          <audio controls preload="none" src={current.url} className="h-10 max-w-full">
            <track kind="captions" />
          </audio>
          <span className="text-[14px] text-ink-2">{t("by", { name: current.reciter })}</span>
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-[14px] font-semibold text-haram underline underline-offset-4">
            {t("replace")}
          </button>
          <button type="button" onClick={() => void remove()} disabled={pending} className="text-[14px] font-semibold text-due underline underline-offset-4">
            {t("remove")}
          </button>
        </div>
      ) : (
        <span className="text-[14px] text-ink-3">{t("none")}</span>
      )}
      {open ? (
        <form onSubmit={upload} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field id={`reciter-${itemId}`} name="reciter" required minLength={2} maxLength={80} defaultValue={current?.reciter ?? defaultName} label={t("reciter")} hint={t("reciterHint")} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("file")}
            <input name="file" type="file" accept="audio/*" required className="text-[14px] font-normal" />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? t("uploading") : t("upload")}
          </Button>
          {error ? (
            <p role="alert" className="text-[14px] font-semibold text-due sm:col-span-3">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
