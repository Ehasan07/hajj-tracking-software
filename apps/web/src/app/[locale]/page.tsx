import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/format";
import { loadSite, resolvePublicTenant } from "@/server/site";
import { Landing } from "./_landing/landing";
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
  if (site?.settings && site.web.published) {
    const { package: selected } = await searchParams;
    const valid = site.packages.some((p) => p.id === selected) ? selected : undefined;
    return <AgencySite site={site} locale={locale} selectedPackage={valid} base={site.slug ? `/site/${site.slug}` : ""} />;
  }

  return <Landing locale={locale} />;
}
