"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";
import { uploadSiteImage } from "../website/image-upload";

/** The photo on a package's website card: click to add or replace. */
export function PackagePhoto({ id, url, name }: { id: string; url: string | null; name: string }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const save = useMutation(trpc.packages.setImage.mutationOptions({ onSuccess: () => router.refresh() }));

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const result = await uploadSiteImage("package", file);
    if ("error" in result) setError(t(`errors.${result.error}` as "errors.generic"));
    else await save.mutateAsync({ id, imageKey: result.key });
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <label className="relative grid h-14 w-16 cursor-pointer place-items-center overflow-hidden rounded-md border-[1.5px] border-dashed border-line-strong bg-field focus-within:ring-2 focus-within:ring-haram" title={t("packages.photo")}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("packages.photoFor", { name })} onChange={(e) => void choose(e.target.files?.[0])} />
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <UploadIcon size={20} accent="var(--color-haram)" />
        )}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-paper/70">
            <Spinner label={t("website.image.uploading")} className="h-5 w-5" />
          </span>
        ) : null}
      </label>
      {url ? (
        <button type="button" onClick={() => save.mutate({ id, imageKey: null })} className="text-[12px] font-semibold text-due hover:underline">
          {t("website.image.remove")}
        </button>
      ) : null}
      {error ? (
        <span role="alert" className="max-w-24 text-center text-[11px] font-semibold text-due">
          {error}
        </span>
      ) : null}
    </div>
  );
}
