import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleBody, articlePreview } from "@/components/article-body";
import { ArrowIcon } from "@/components/icons";
import { StarDivider } from "@/components/sacred";
import { buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, type Locale } from "@/lib/format";
import { canPreviewSite, loadPost, loadSite, resolveSiteSlug } from "@/server/site";
import { AgencyMark, pick, themeStyle } from "../../../../_site/agency-site";

type Params = Promise<{ locale: Locale; slug: string; post: string }>;

async function postFor(slug: string, postSlug: string) {
  const tenantId = await resolveSiteSlug(slug);
  if (!tenantId || !/^[a-z0-9-]{3,80}$/.test(postSlug)) return null;
  const site = await loadSite(tenantId);
  if (!site.settings) return null;
  if (!site.web.published && !(await canPreviewSite(tenantId))) return null;
  const post = await loadPost(tenantId, postSlug);
  return post ? { site, post } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug, post: postSlug } = await params;
  const found = await postFor(slug, postSlug);
  if (!found) return {};
  const title = pick(locale, found.post.titleBn, found.post.titleEn);
  const description = articlePreview(pick(locale, found.post.bodyBn, found.post.bodyEn)).slice(0, 160);
  return {
    title: { absolute: `${title} · ${found.site.settings!.legalName}` },
    description,
    openGraph: { title, description, images: found.post.coverUrl ? [found.post.coverUrl] : undefined },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { locale, slug, post: postSlug } = await params;
  setRequestLocale(locale);
  const found = await postFor(slug, postSlug);
  if (!found) notFound();
  const { site, post } = found;
  const t = await getTranslations("site");
  const base = `/site/${slug}`;

  return (
    <div className="min-h-dvh" style={themeStyle(site.web.theme)}>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href={base} className="flex min-w-0 items-center gap-2.5">
            <AgencyMark logoUrl={site.web.logoUrl} />
            <span className="truncate text-lg font-bold">{site.settings!.legalName}</span>
          </Link>
          <Link href={`${base}#posts`} className={buttonClass("outline", "h-11 px-4 text-[15px]")}>
            <ArrowIcon size={18} className="rotate-180" />
            {t("posts.back")}
          </Link>
        </div>
      </header>
      <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="rounded-full bg-haram-tint px-3 py-0.5 font-bold text-haram-deep">{t(`posts.kinds.${post.kind as "news" | "notice" | "offer"}`)}</span>
          {post.publishedAt ? <span className="text-ink-3">{dateText(post.publishedAt, locale)}</span> : null}
        </div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">{pick(locale, post.titleBn, post.titleEn)}</h1>
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="w-full rounded-[28px_28px_16px_16px] object-cover" />
        ) : null}
        <div className="flex flex-col gap-4 text-[17px] leading-relaxed text-ink-2">
          <ArticleBody text={pick(locale, post.bodyBn, post.bodyEn)} locale={locale} />
        </div>
        <StarDivider className="mt-6 text-saffron" />
        <Link href={`${base}#inquiry`} className={buttonClass("primary", "h-14 self-center px-7 text-lg")}>
          {t("posts.contact")}
        </Link>
      </article>
    </div>
  );
}
