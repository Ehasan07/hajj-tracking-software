"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import { ChevronIcon, UploadIcon } from "@/components/icons";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";
import { uploadSiteImage } from "./image-upload";

export interface PhotoRow {
  id: string;
  url: string;
  captionBn: string | null;
  captionEn: string | null;
}

function Caption({ photo }: { photo: PhotoRow }) {
  const t = useTranslations("website.gallery");
  const trpc = useTRPC();
  const router = useRouter();
  const [value, setValue] = useState(photo.captionBn ?? "");
  const save = useMutation(trpc.website.updatePhoto.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <input
      value={value}
      maxLength={200}
      aria-label={t("caption")}
      placeholder={t("caption")}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== (photo.captionBn ?? "") && save.mutate({ id: photo.id, captionBn: value, captionEn: photo.captionEn ?? undefined })}
      className="h-10 w-full rounded-md border border-line bg-field px-3 text-[14px] outline-none focus:border-haram"
    />
  );
}

/** Photos from past journeys: add several at once, caption, reorder, remove. */
export function GalleryManager({ photos }: { photos: PhotoRow[] }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const add = useMutation(trpc.website.addPhoto.mutationOptions());
  const move = useMutation(trpc.website.movePhoto.mutationOptions({ onSuccess: () => router.refresh() }));
  const remove = useMutation(trpc.website.deletePhoto.mutationOptions({ onSuccess: () => router.refresh() }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    const list = [...files].slice(0, 20);
    setBusy({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      const result = await uploadSiteImage("gallery", file);
      if ("error" in result) {
        setError(`${file.name}: ${t(`errors.${result.error}` as "errors.generic")}`);
      } else {
        try {
          await add.mutateAsync({ key: result.key });
        } catch {
          setError(t("errors.GALLERY_FULL"));
          break;
        }
      }
      setBusy({ done: i + 1, total: list.length });
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-[14px] text-ink-3">{t("website.gallery.hint")}</p>
        <label className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-md bg-haram px-5 font-semibold text-white focus-within:ring-2 focus-within:ring-haram-deep">
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(busy)} onChange={(e) => void upload(e.target.files)} />
          {busy ? <Spinner label={t("website.image.uploading")} className="h-5 w-5" /> : <UploadIcon size={20} accent="var(--color-saffron)" />}
          {busy ? t("website.gallery.progress", { done: busy.done, total: busy.total }) : t("website.gallery.add")}
        </label>
      </Card>
      {error ? (
        <p role="alert" className="rounded-md bg-due-tint px-4 py-3 text-[14px] font-semibold text-due">
          {error}
        </p>
      ) : null}
      <FormError error={move.error ?? remove.error} />
      {photos.length === 0 ? (
        <Card>
          <EmptyState title={t("website.gallery.empty")} body={t("website.gallery.emptyBody")} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <Card key={p.id} className="flex flex-col gap-3 overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.captionBn ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-col gap-3 px-4 pb-4">
                <Caption photo={p} />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: p.id, dir: "up" })} aria-label={t("website.gallery.earlier")} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                      <ChevronIcon dir="left" size={18} />
                    </button>
                    <button type="button" disabled={i === photos.length - 1 || move.isPending} onClick={() => move.mutate({ id: p.id, dir: "down" })} aria-label={t("website.gallery.later")} className="grid h-9 w-9 place-items-center rounded-md hover:bg-ground disabled:opacity-30">
                      <ChevronIcon dir="right" size={18} />
                    </button>
                  </div>
                  <Button type="button" variant="danger" className="h-9 px-3 text-[13px]" onClick={() => window.confirm(t("website.gallery.confirmDelete")) && remove.mutate({ id: p.id })}>
                    {t("website.gallery.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
