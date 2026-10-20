import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import type { Locale } from "@/lib/format";

/** Shown by the installed app when a page needs the internet and there is none. Kept on the phone. */
export default async function OfflinePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa.offline");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandMark className="h-16 w-16" />
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <p className="text-[17px] leading-relaxed text-ink-2">{t("body")}</p>
      {/* Plain links: they load the copies kept on the phone. */}
      <a href={locale === "en" ? "/en/guide" : "/guide"} className="inline-flex h-12 items-center rounded-md bg-haram px-6 font-semibold text-white">
        {t("guide")}
      </a>
      <a href={locale === "en" ? "/en/start" : "/start"} className="font-semibold text-haram underline underline-offset-4">
        {t("home")}
      </a>
    </main>
  );
}
