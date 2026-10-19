"use client";

import { useMutation } from "@tanstack/react-query";
import { THEME_KEYS, THEMES, themeFromColor, type ThemeKey } from "@hajj/core";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { CheckIcon } from "@/components/icons";
import { Button, Card, Field, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";
import { ImageUpload } from "./image-upload";

export interface GeneralValues {
  published: boolean;
  theme: string;
  customColor: string | null;
  logoUrl: string | null;
  heroUrl: string | null;
  taglineBn: string | null;
  taglineEn: string | null;
  aboutBn: string | null;
  aboutEn: string | null;
  whatsapp: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  officeHours: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

/** The website's address, with copy and open. Changing the address asks first: old links stop working. */
export function AddressCard({ origin, slug }: { origin: string; slug: string }) {
  const t = useTranslations("website.address");
  const trpc = useTRPC();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slug);
  const [copied, setCopied] = useState(false);
  const save = useMutation(trpc.website.setSlug.mutationOptions({ onSuccess: () => (setEditing(false), router.refresh()) }));
  const link = `${origin}/site/${slug}`;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-[14px] text-ink-3">{t("hint")}</p>
      </div>
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (value !== slug && !window.confirm(t("confirm"))) return;
            save.mutate({ slug: value });
          }}
        >
          <label htmlFor="ws-slug" className="text-sm font-semibold">
            {t("label")}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] text-ink-3">{origin.replace(/^https?:\/\//, "")}/site/</span>
            <input
              id="ws-slug"
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              minLength={3}
              maxLength={40}
              required
              className="h-11 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong bg-field px-3 font-mono text-[16px] outline-none focus:border-haram"
            />
          </div>
          <p className="text-[13px] text-ink-3">{t("rule")}</p>
          <FormError error={save.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {t("save")}
            </Button>
            <Button type="button" variant="quiet" onClick={() => (setEditing(false), setValue(slug))}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <a href={`/site/${slug}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate rounded-md bg-haram-tint px-4 py-3 font-mono text-[15px] font-semibold text-haram-deep">
            {link}
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(link).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <CheckIcon size={18} /> : null}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button type="button" variant="quiet" onClick={() => setEditing(true)}>
            {t("change")}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** A tiny picture of the site in the chosen colours. */
function ThemePreview({ color }: { color: string }) {
  const c = themeFromColor(color);
  return (
    <div className="flex overflow-hidden rounded-md border border-line" aria-hidden="true">
      <span className="h-8 flex-1" style={{ background: c.primary }} />
      <span className="h-8 flex-1" style={{ background: c.deep }} />
      <span className="h-8 flex-1" style={{ background: c.night }} />
      <span className="h-8 flex-1" style={{ background: c.tint }} />
    </div>
  );
}

export function GeneralForm({ values }: { values: GeneralValues }) {
  const t = useTranslations("website");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [published, setPublished] = useState(values.published);
  const [theme, setTheme] = useState<string>(values.customColor ? "custom" : values.theme);
  const [custom, setCustom] = useState(values.customColor ?? "#0b7a6f");
  const [saved, setSaved] = useState(false);
  const save = useMutation(trpc.website.save.mutationOptions({ onSuccess: () => (setSaved(true), router.refresh()) }));
  const setImage = useMutation(trpc.website.setImage.mutationOptions({ onSuccess: () => router.refresh() }));
  const adjusted = useMemo(() => (theme === "custom" ? themeFromColor(custom).primary : null), [theme, custom]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const f = new FormData(event.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim() || undefined;
    save.mutate({
      published,
      theme: theme === "custom" ? values.theme : theme,
      customColor: theme === "custom" ? custom : null,
      taglineBn: s("taglineBn"),
      taglineEn: s("taglineEn"),
      aboutBn: s("aboutBn"),
      aboutEn: s("aboutEn"),
      whatsapp: s("whatsapp"),
      facebookUrl: s("facebookUrl"),
      youtubeUrl: s("youtubeUrl"),
      officeHours: s("officeHours"),
      phone: s("phone"),
      email: s("email") ?? "",
      address: s("address"),
    });
  }

  return (
    <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="flex flex-col gap-6">
      {/* ------------------------------------------------------------ on/off */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">{t("published.title")}</h2>
          <p className="text-[14px] text-ink-3">{published ? t("published.on") : t("published.off")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          aria-label={t("published.title")}
          onClick={() => (setPublished((v) => !v), setSaved(false))}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${published ? "bg-paid" : "bg-line-strong"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${published ? "left-7" : "left-1"}`} />
        </button>
      </Card>

      {/* ------------------------------------------------------------- look */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">{t("look.title")}</h2>
          <p className="text-[14px] text-ink-3">{t("look.hint")}</p>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">{t("look.theme")}</legend>
          {THEME_KEYS.map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer flex-col gap-2 rounded-lg border-[1.5px] p-3 transition-colors focus-within:ring-2 focus-within:ring-haram ${
                theme === key ? "border-haram bg-haram-tint/40" : "border-line hover:border-line-strong"
              }`}
            >
              <input type="radio" name="theme" value={key} checked={theme === key} onChange={() => setTheme(key)} className="sr-only" />
              <ThemePreview color={THEMES[key as ThemeKey].primary} />
              <span className="flex items-center justify-between text-[14px] font-semibold">
                {THEMES[key as ThemeKey][locale]}
                {theme === key ? <CheckIcon size={16} className="text-haram" /> : null}
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer flex-col gap-2 rounded-lg border-[1.5px] p-3 transition-colors focus-within:ring-2 focus-within:ring-haram ${
              theme === "custom" ? "border-haram bg-haram-tint/40" : "border-line hover:border-line-strong"
            }`}
          >
            <input type="radio" name="theme" value="custom" checked={theme === "custom"} onChange={() => setTheme("custom")} className="sr-only" />
            <ThemePreview color={custom} />
            <span className="flex items-center justify-between gap-2 text-[14px] font-semibold">
              {t("look.custom")}
              <input
                type="color"
                value={custom}
                aria-label={t("look.pick")}
                onChange={(e) => (setCustom(e.target.value), setTheme("custom"))}
                className="h-7 w-10 cursor-pointer rounded border border-line bg-transparent"
              />
            </span>
          </label>
        </fieldset>
        {adjusted && adjusted !== custom.toLowerCase() ? <p className="text-[13px] text-saffron-ink">{t("look.darkened")}</p> : null}

        <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
          <ImageUpload
            purpose="logo"
            url={values.logoUrl}
            label={t("look.logo")}
            hint={t("look.logoHint")}
            frame="aspect-square w-full max-w-[200px]"
            onChange={(key) => setImage.mutateAsync({ slot: "logo", key })}
          />
          <ImageUpload
            purpose="hero"
            url={values.heroUrl}
            label={t("look.hero")}
            hint={t("look.heroHint")}
            frame="aspect-[16/9] w-full"
            onChange={(key) => setImage.mutateAsync({ slot: "hero", key })}
          />
        </div>
        <FormError error={setImage.error} />
      </Card>

      {/* ------------------------------------------------------------ words */}
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <h2 className="text-lg font-bold">{t("words.title")}</h2>
          <p className="text-[14px] text-ink-3">{t("words.hint")}</p>
        </div>
        <Field id="ws-tagline-bn" name="taglineBn" maxLength={160} defaultValue={values.taglineBn ?? ""} label={t("words.taglineBn")} placeholder={t("words.taglinePlaceholder")} />
        <Field id="ws-tagline-en" name="taglineEn" maxLength={160} defaultValue={values.taglineEn ?? ""} label={t("words.taglineEn")} />
        <TextAreaField id="ws-about-bn" name="aboutBn" maxLength={3000} defaultValue={values.aboutBn ?? ""} label={t("words.aboutBn")} hint={t("words.aboutHint")} className="min-h-36" />
        <TextAreaField id="ws-about-en" name="aboutEn" maxLength={3000} defaultValue={values.aboutEn ?? ""} label={t("words.aboutEn")} className="min-h-36" />
      </Card>

      {/* ---------------------------------------------------------- contact */}
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <h2 className="text-lg font-bold">{t("contact.title")}</h2>
          <p className="text-[14px] text-ink-3">{t("contact.hint")}</p>
        </div>
        <Field id="ws-phone" name="phone" inputMode="tel" maxLength={30} defaultValue={values.phone ?? ""} label={t("contact.phone")} placeholder="01XXX-XXXXXX" />
        <Field id="ws-whatsapp" name="whatsapp" inputMode="tel" maxLength={30} defaultValue={values.whatsapp ?? ""} label={t("contact.whatsapp")} placeholder="01XXX-XXXXXX" />
        <Field id="ws-email" name="email" type="email" maxLength={200} defaultValue={values.email ?? ""} label={t("contact.email")} />
        <Field id="ws-hours" name="officeHours" maxLength={120} defaultValue={values.officeHours ?? ""} label={t("contact.hours")} placeholder={t("contact.hoursPlaceholder")} />
        <div className="sm:col-span-2">
          <TextAreaField id="ws-address" name="address" maxLength={500} defaultValue={values.address ?? ""} label={t("contact.address")} className="min-h-20" />
        </div>
        <Field id="ws-facebook" name="facebookUrl" type="url" maxLength={300} defaultValue={values.facebookUrl ?? ""} label={t("contact.facebook")} placeholder="https://facebook.com/…" />
        <Field id="ws-youtube" name="youtubeUrl" type="url" maxLength={300} defaultValue={values.youtubeUrl ?? ""} label={t("contact.youtube")} placeholder="https://youtube.com/@…" />
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper/95 p-4 shadow-lg backdrop-blur">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
        {saved ? (
          <span role="status" className="flex items-center gap-1.5 text-[15px] font-semibold text-paid">
            <CheckIcon size={18} />
            {t("saved")}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <FormError error={save.error} />
        </div>
      </div>
    </form>
  );
}
