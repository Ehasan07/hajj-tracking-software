import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/format";
import { canPreviewSite, loadSite, resolveSiteSlug } from "@/server/site";
import { AgencySite, pick } from "../../_site/agency-site";

type Params = Promise<{ locale: Locale; slug: string }>;

/** The site for this address, or null. A switched-off site is shown only to the agency's own managers. */
async function siteFor(slug: string) {
  const tenantId = await resolveSiteSlug(slug);
  const site = tenantId ? await loadSite(tenantId) : null;
  if (!tenantId || !site?.settings) return null;
  if (site.web.published) return { site, preview: false };
  return (await canPreviewSite(tenantId)) ? { site, preview: true } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await siteFor(slug);
  if (!found) return {};
  const { site, preview } = found;
  const description = pick(locale, site.web.taglineBn, site.web.taglineEn) || pick(locale, site.web.aboutBn, site.web.aboutEn).slice(0, 160) || undefined;
  return {
    title: { absolute: site.settings!.legalName },
    description,
    openGraph: { title: site.settings!.legalName, description, images: site.web.heroUrl ? [site.web.heroUrl] : undefined },
    robots: preview ? { index: false, follow: false } : undefined,
  };
}

export default async function AgencyWebsite({ params, searchParams }: { params: Params; searchParams: Promise<{ package?: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const found = await siteFor(slug);
  if (!found) notFound();
  const { package: selected } = await searchParams;
  const valid = found.site.packages.some((p) => p.id === selected) ? selected : undefined;
  return <AgencySite site={found.site} locale={locale} selectedPackage={valid} base={`/site/${slug}`} preview={found.preview} />;
}
