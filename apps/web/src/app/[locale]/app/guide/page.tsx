import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookIcon, PlusIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, buttonClass, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { articlePreview } from "@/components/article-body";
import { ArticleEditor } from "./article-editor";
import { StarterButton } from "./starter-button";

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { edit, new: isNew } = await searchParams;
  const t = await getTranslations();
  const caller = await api();
  const list = await caller.articles.list();
  const editing = edit ? list.find((a) => a.id === edit) : undefined;
  const showEditor = Boolean(isNew) || Boolean(editing);

  return (
    <PageBody>
      <PageHeader
        title={t("guide.title")}
        subtitle={t("guide.subtitle")}
        actions={
          showEditor ? null : (
            <Link href="/app/guide?new=1" className={buttonClass("primary")}>
              <PlusIcon size={18} />
              {t("guide.new")}
            </Link>
          )
        }
      />

      {showEditor ? (
        <Card className="animate-rise p-6">
          <ArticleEditor article={editing} />
        </Card>
      ) : null}

      {list.length === 0 && !showEditor ? (
        <Card>
          <EmptyState title={t("guide.empty")} body={t("guide.emptyBody")} action={<StarterButton />} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a, i) => (
            <Link
              key={a.id}
              href={`/app/guide/${a.id}`}
              className="lift flex animate-rise flex-col gap-3 rounded-[60px_60px_18px_18px] bg-paper px-6 pt-7 pb-5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-unit-supernova-tint">
                  <BookIcon size={26} tint="var(--color-paper)" accent="var(--color-unit-supernova)" />
                </span>
                <Badge tone={a.published ? "paid" : "neutral"}>{a.published ? t("guide.published") : t("guide.draft")}</Badge>
              </span>
              <span className="text-[13px] font-semibold text-ink-3">{t(`articleCategory.${a.category}`)}</span>
              <b className="text-lg leading-snug">{locale === "bn" ? a.titleBn : a.titleEn}</b>
              <p className="line-clamp-3 text-[15px] text-ink-2">{articlePreview(locale === "bn" ? a.bodyBn : a.bodyEn)}</p>
            </Link>
          ))}
        </div>
      )}
    </PageBody>
  );
}
