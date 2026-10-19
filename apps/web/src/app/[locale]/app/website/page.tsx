import { getTranslations, setRequestLocale } from "next-intl/server";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import { MANAGER_ROLES } from "@/lib/units";
import { siteImageUrl } from "@/server/site-media";
import { api } from "@/trpc/server";
import { FaqManager } from "./faq-manager";
import { GalleryManager } from "./gallery-manager";
import { AddressCard, GeneralForm } from "./general-form";
import { PostsManager } from "./posts-manager";
import { ReviewsManager } from "./reviews-manager";
import { SectionsForm } from "./sections-form";

const TABS = ["general", "sections", "posts", "gallery", "reviews", "faq"] as const;
type Tab = (typeof TABS)[number];

/** The agency's own public website, arranged from here: look, words, sections, posts, photos, reviews, questions. */
export default async function WebsitePage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("website");
  const caller = await api();
  const me = await caller.tenant.me();
  if (!MANAGER_ROLES.includes(me.role)) return <NoAccess />;

  const requested = (await searchParams).tab;
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "") ? (requested as Tab) : "general";
  const site = await caller.website.get();
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3100").origin;
  const base = `/site/${site.slug}`;

  return (
    <PageBody>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <a href={base} target="_blank" rel="noopener" className={buttonClass("outline")}>
            {t("open")}
          </a>
        }
      />

      <nav aria-label={t("title")} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((id) => (
          <Link
            key={id}
            href={{ pathname: "/app/website", query: { tab: id } }}
            aria-current={tab === id ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${
              tab === id ? "bg-haram text-white" : "bg-paper text-ink-2 hover:bg-haram-tint"
            }`}
          >
            {t(`tabs.${id}`)}
            {id === "reviews" && site.pendingReviews > 0 ? (
              <span className={`rounded-full px-2 text-[12px] ${tab === id ? "bg-white/25" : "bg-saffron text-ink"}`}>{digits(site.pendingReviews, locale)}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {tab === "general" ? (
        <>
          <AddressCard origin={origin} slug={site.slug} />
          <GeneralForm
            values={{
              ...site.settings,
              logoUrl: siteImageUrl(site.settings.logoKey),
              heroUrl: siteImageUrl(site.settings.heroKey),
              phone: site.contact?.phone ?? null,
              email: site.contact?.email ?? null,
              address: site.contact?.address ?? null,
            }}
          />
        </>
      ) : null}
      {tab === "sections" ? <SectionsForm initial={site.settings.sections} /> : null}
      {tab === "posts" ? <PostsManager base={base} posts={(await caller.website.posts()).map((p) => ({ ...p, coverUrl: siteImageUrl(p.coverKey) }))} /> : null}
      {tab === "gallery" ? (
        <GalleryManager photos={(await caller.website.gallery()).map((g) => ({ id: g.id, url: siteImageUrl(g.imageKey)!, captionBn: g.captionBn, captionEn: g.captionEn }))} />
      ) : null}
      {tab === "reviews" ? <ReviewsManager reviews={await caller.website.reviews()} /> : null}
      {tab === "faq" ? <FaqManager faqs={await caller.website.faqs()} /> : null}
    </PageBody>
  );
}
