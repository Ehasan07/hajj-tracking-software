"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";

export type ImagePurpose = "logo" | "hero" | "gallery" | "post" | "package";

const MAX_BYTES = 8 * 1024 * 1024;

/** Send one picture to the server; it comes back re-encoded and stored. */
export async function uploadSiteImage(purpose: ImagePurpose, file: File): Promise<{ key: string; url: string } | { error: string }> {
  if (file.size > MAX_BYTES) return { error: "TOO_LARGE" };
  const body = new FormData();
  body.set("purpose", purpose);
  body.set("file", file);
  const res = await fetch("/api/site/upload", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { key?: string; url?: string; error?: string };
  if (!res.ok || !json.key) return { error: json.error ?? "generic" };
  return { key: json.key, url: json.url! };
}

/**
 * Pick a picture, see it straight away, and hand its storage key to the
 * caller (which saves it). `frame` sets the preview's shape.
 */
export function ImageUpload({
  purpose,
  url,
  label,
  hint,
  onChange,
  frame = "aspect-[4/3] w-full",
}: {
  purpose: ImagePurpose;
  url: string | null;
  label: string;
  hint?: string;
  onChange: (key: string | null) => unknown;
  frame?: string;
}) {
  const t = useTranslations();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setPreview(url), [url]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    const result = await uploadSiteImage(purpose, file);
    if ("error" in result) {
      setError(t(`errors.${result.error}` as "errors.generic"));
      setBusy(false);
      return;
    }
    setPreview(URL.createObjectURL(file));
    await onChange(result.key);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-semibold">
        {label}
      </span>
      <div className={`relative overflow-hidden rounded-lg border-[1.5px] border-dashed border-line-strong bg-field ${frame}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={`h-full w-full ${purpose === "logo" ? "object-contain p-3" : "object-cover"}`} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-[13px] text-ink-3">
            <UploadIcon size={28} accent="var(--color-haram)" />
            {t("website.image.empty")}
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/70">
            <Spinner label={t("website.image.uploading")} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border-[1.5px] border-ink bg-paper px-4 text-[14px] font-semibold hover:bg-ground focus-within:ring-2 focus-within:ring-haram">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-labelledby={`${id}-label`}
            disabled={busy}
            onChange={(e) => void choose(e.target.files?.[0])}
          />
          {preview ? t("website.image.replace") : t("website.image.choose")}
        </label>
        {preview ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setPreview(null);
              await onChange(null);
            }}
            className="h-10 rounded-md px-3 text-[14px] font-semibold text-due hover:bg-due-tint"
          >
            {t("website.image.remove")}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-[13px] text-ink-3">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[13px] font-semibold text-due">
          {error}
        </p>
      ) : null}
    </div>
  );
}
