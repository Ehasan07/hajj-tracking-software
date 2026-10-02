"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

const CATEGORIES = ["hajj", "umrah", "documents", "costs", "health", "faq"] as const;

export interface ArticleDraft {
  id?: string;
  category: (typeof CATEGORIES)[number];
  slug: string;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  published: boolean;
  sortOrder: number;
}

export function ArticleEditor({ article }: { article?: ArticleDraft }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const save = useMutation(
    trpc.articles.save.mutationOptions({
      onSuccess: () => {
        router.replace("/app/guide");
        router.refresh();
      },
    }),
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save.mutate({
          id: article?.id,
          category: f.get("category") as ArticleDraft["category"],
          slug: String(f.get("slug")),
          titleBn: String(f.get("titleBn")),
          titleEn: String(f.get("titleEn")),
          bodyBn: String(f.get("bodyBn")),
          bodyEn: String(f.get("bodyEn")),
          published: f.get("published") === "on",
          sortOrder: Number(f.get("sortOrder") || 0),
        });
      }}
    >
      <SelectField id="category" name="category" defaultValue={article?.category ?? "hajj"} label={t("guide.category")}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t(`articleCategory.${c}`)}
          </option>
        ))}
      </SelectField>
      <Field id="slug" name="slug" required defaultValue={article?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" label={t("guide.slug")} hint={t("guide.slugHint")} className="font-mono" />
      <Field id="titleBn" name="titleBn" required lang="bn" defaultValue={article?.titleBn} label={t("guide.titleBn")} />
      <Field id="titleEn" name="titleEn" required lang="en" defaultValue={article?.titleEn} label={t("guide.titleEn")} />
      <TextAreaField id="bodyBn" name="bodyBn" required lang="bn" defaultValue={article?.bodyBn} label={t("guide.bodyBn")} className="min-h-56" />
      <TextAreaField id="bodyEn" name="bodyEn" required lang="en" defaultValue={article?.bodyEn} label={t("guide.bodyEn")} className="min-h-56" />
      <label className="flex h-12 items-center gap-3 text-[15px] font-semibold">
        <input type="checkbox" name="published" defaultChecked={article?.published} className="h-5 w-5 accent-[var(--color-haram)]" />
        {t("guide.publish")}
      </label>
      <Field id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={article?.sortOrder ?? 0} label="#" />
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError error={save.error} />
        <Button type="submit" disabled={save.isPending} className="self-start">
          {t("guide.save")}
        </Button>
      </div>
    </form>
  );
}
