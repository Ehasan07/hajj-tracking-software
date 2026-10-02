import { getTranslations, setRequestLocale } from "next-intl/server";
import { getItem } from "@hajj/sacred";
import { LabbaikOrnament, QuranAttribution, StarDivider, Verses } from "@/components/sacred";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { loadSite, resolvePublicTenant } from "@/server/site";
import { AgencySite } from "./_site/agency-site";

export async function generateMetadata() {
  const tenantId = await resolvePublicTenant();
  const site = tenantId ? await loadSite(tenantId) : null;
  return site?.settings ? { title: { absolute: site.settings.legalName } } : {};
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ package?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // An agency's own website when this host (or the configured default) belongs to one.
  const tenantId = await resolvePublicTenant();
  const site = tenantId ? await loadSite(tenantId) : null;
  if (site?.settings) {
    const { package: selected } = await searchParams;
    const valid = site.packages.some((p) => p.id === selected) ? selected : undefined;
    return <AgencySite site={site} locale={locale} selectedPackage={valid} />;
  }

  const t = await getTranslations();
  // This page belongs to no agency, so no scholar has approved a meaning here: Arabic and its citation only.
  const house = getItem("ayah_first_house");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <LabbaikOrnament className="pointer-events-none absolute -top-10 -right-10 text-[260px] text-haram-tint sm:text-[360px]" />
      <Khatam className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] animate-turn text-[#dde8e5]" strokeWidth={0.6} />

      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-16 sm:px-8">
        <span className="flex h-14 w-12 animate-rise items-center justify-center rounded-[24px_24px_10px_10px] bg-haram">
          <Khatam className="h-8 w-8 text-saffron" strokeWidth={7} />
        </span>
        <h1 className="max-w-3xl animate-rise font-display text-5xl leading-tight [animation-delay:80ms] sm:text-7xl">
          {t("meta.title")}
        </h1>
        <p className="max-w-xl animate-rise text-lg text-ink-2 [animation-delay:140ms]">{t("meta.description")}</p>
        <div className="flex animate-rise flex-wrap gap-3 [animation-delay:200ms]">
          <Link href="/sign-in" className={buttonClass("primary", "h-14 px-7 text-lg")}>
            {t("common.signIn")}
          </Link>
          <Link href="/" locale={locale === "bn" ? "en" : "bn"} className={buttonClass("outline", "h-14 px-7 text-lg")}>
            {t("common.switchTo")}
          </Link>
        </div>
      </section>

      <section className="relative mx-auto mb-12 w-full max-w-5xl animate-rise px-4 [animation-delay:320ms] sm:px-8">
        <div className="flex flex-col gap-5 rounded-[160px_160px_24px_24px] bg-paper px-6 pt-14 pb-8 shadow-[0_30px_60px_-40px_rgb(18_48_46/0.45)] sm:px-14">
          <StarDivider />
          <Verses item={house} className="text-center text-[26px] sm:text-[32px]" />
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-ink-3">
            <span>{house.citation[locale]}</span>
            <span aria-hidden="true">·</span>
            <QuranAttribution locale={locale} />
          </div>
        </div>
      </section>
    </main>
  );
}
