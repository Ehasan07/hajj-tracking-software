import { getTranslations, setRequestLocale } from "next-intl/server";
import { Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-8 px-4 sm:px-8">
      <Khatam className="h-12 w-12 text-gold" />
      <h1 className="max-w-3xl font-display text-5xl leading-tight sm:text-7xl">{t("meta.title")}</h1>
      <p className="max-w-xl text-lg text-ink-2">{t("meta.description")}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="inline-flex h-12 items-center rounded-md bg-zamzam px-6 font-semibold text-white shadow-[inset_0_-2px_0_var(--color-zamzam-deep)]"
        >
          {t("common.signIn")}
        </Link>
        <Link
          href="/"
          locale={locale === "bn" ? "en" : "bn"}
          className="inline-flex h-12 items-center rounded-md border border-ink px-6 font-semibold"
        >
          {t("common.switchTo")}
        </Link>
      </div>
    </main>
  );
}
