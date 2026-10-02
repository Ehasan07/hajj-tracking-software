import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleBody } from "@/components/article-body";
import { BookIcon } from "@/components/icons";
import { PageBody } from "@/components/page-header";
import { StarDivider } from "@/components/sacred";
import { Badge, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";

export default async function ArticlePage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const a = await (await api()).articles.get({ id });
  const title = locale === "bn" ? a.titleBn : a.titleEn;
  const body = locale === "bn" ? a.bodyBn : a.bodyEn;

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/guide" className={buttonClass("outline", "h-11")}>
          ← {t("guide.back")}
        </Link>
        <Link href={`/app/guide?edit=${a.id}`} className={buttonClass("primary", "h-11")}>
          {t("guide.edit")}
        </Link>
      </div>
      <article className="mx-auto flex w-full max-w-3xl animate-rise flex-col gap-6 rounded-[80px_80px_24px_24px] bg-paper px-6 pt-14 pb-10 sm:px-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-unit-supernova-tint">
            <BookIcon size={30} tint="var(--color-paper)" accent="var(--color-unit-supernova)" />
          </span>
          <span className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone="info">{t(`articleCategory.${a.category}`)}</Badge>
            <Badge tone={a.published ? "paid" : "neutral"}>{a.published ? t("guide.published") : t("guide.draft")}</Badge>
          </span>
          <h1 className="font-display text-3xl leading-snug sm:text-4xl">{title}</h1>
          <span className="text-[13px] text-ink-3">{dateText(a.updatedAt, locale)}</span>
        </div>
        <StarDivider />
        {!a.published ? <p className="rounded-md bg-saffron-tint px-4 py-3 text-[14px] text-saffron-ink">{t("guide.draftNote")}</p> : null}
        <ArticleBody text={body} locale={locale} />
      </article>
    </PageBody>
  );
}
