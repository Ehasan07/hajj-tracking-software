"use client";

import { useMutation } from "@tanstack/react-query";
import { POST_KINDS, type PostKind } from "@hajj/core";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { PlusIcon } from "@/components/icons";
import { Badge, Button, Card, EmptyState, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { dateText, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";
import { ImageUpload } from "./image-upload";

export interface PostRow {
  id: string;
  kind: string;
  slug: string;
  titleBn: string;
  titleEn: string | null;
  bodyBn: string;
  bodyEn: string | null;
  coverKey: string | null;
  coverUrl: string | null;
  published: boolean;
  pinned: boolean;
  publishedAt: Date | null;
}

function PostEditor({ post, onDone }: { post?: PostRow; onDone: () => void }) {
  const t = useTranslations("website.posts");
  const trpc = useTRPC();
  const router = useRouter();
  const [coverKey, setCoverKey] = useState<string | null>(post?.coverKey ?? null);
  const [showEnglish, setShowEnglish] = useState(Boolean(post?.titleEn || post?.bodyEn));
  const save = useMutation(trpc.website.savePost.mutationOptions({ onSuccess: () => (router.refresh(), onDone()) }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    save.mutate({
      id: post?.id,
      kind: s("kind") as PostKind,
      titleBn: s("titleBn"),
      titleEn: s("titleEn") || undefined,
      bodyBn: s("bodyBn"),
      bodyEn: s("bodyEn") || undefined,
      coverKey,
      published: f.get("published") === "on",
      pinned: f.get("pinned") === "on",
    });
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="text-lg font-bold">{post ? t("edit") : t("new")}</h2>
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <SelectField id="po-kind" name="kind" defaultValue={post?.kind ?? "news"} label={t("kind")}>
            {POST_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </SelectField>
          <Field id="po-title-bn" name="titleBn" required minLength={3} maxLength={160} defaultValue={post?.titleBn} label={t("titleBn")} placeholder={t("titlePlaceholder")} />
          <TextAreaField id="po-body-bn" name="bodyBn" required minLength={10} maxLength={8000} defaultValue={post?.bodyBn} label={t("bodyBn")} hint={t("formatting")} className="min-h-56" />
          {showEnglish ? (
            <>
              <Field id="po-title-en" name="titleEn" maxLength={160} defaultValue={post?.titleEn ?? ""} label={t("titleEn")} />
              <TextAreaField id="po-body-en" name="bodyEn" maxLength={8000} defaultValue={post?.bodyEn ?? ""} label={t("bodyEn")} className="min-h-40" />
            </>
          ) : (
            <button type="button" onClick={() => setShowEnglish(true)} className="self-start text-[14px] font-semibold text-haram underline underline-offset-4">
              {t("addEnglish")}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <ImageUpload purpose="post" url={post?.coverUrl ?? null} label={t("cover")} hint={t("coverHint")} frame="aspect-[16/10] w-full" onChange={(key) => setCoverKey(key)} />
          <label className="flex items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" name="published" defaultChecked={post?.published ?? true} className="h-5 w-5 accent-haram" />
            {t("publish")}
          </label>
          <label className="flex items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" name="pinned" defaultChecked={post?.pinned ?? false} className="h-5 w-5 accent-haram" />
            {t("pin")}
          </label>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-2">
          <FormError error={save.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {t("save")}
            </Button>
            <Button type="button" variant="quiet" onClick={onDone}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

export function PostsManager({ posts, base }: { posts: PostRow[]; base: string }) {
  const t = useTranslations("website.posts");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [editing, setEditing] = useState<PostRow | "new" | null>(null);
  const remove = useMutation(trpc.website.deletePost.mutationOptions({ onSuccess: () => router.refresh() }));

  if (editing) return <PostEditor post={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-ink-3">{t("hint")}</p>
        <Button type="button" onClick={() => setEditing("new")}>
          <PlusIcon size={18} />
          {t("new")}
        </Button>
      </div>
      {posts.length === 0 ? (
        <Card>
          <EmptyState title={t("empty")} body={t("emptyBody")} />
        </Card>
      ) : (
        posts.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-4 p-4">
            {p.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverUrl} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="h-16 w-24 shrink-0 rounded-md bg-haram-tint" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[16px]">{p.titleBn}</b>
                <Badge tone={p.published ? "paid" : "neutral"}>{p.published ? t("live") : t("draft")}</Badge>
                {p.pinned ? <Badge tone="pending">{t("pinned")}</Badge> : null}
              </div>
              <span className="text-[13px] text-ink-3">
                {t(`kinds.${p.kind as PostKind}`)}
                {p.publishedAt ? ` · ${dateText(p.publishedAt, locale)}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.published ? (
                <a href={`${base}/posts/${p.slug}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-md px-3 text-[14px] font-semibold text-haram hover:bg-haram-tint">
                  {t("view")}
                </a>
              ) : null}
              <Button type="button" variant="outline" className="h-10 px-4 text-[14px]" onClick={() => setEditing(p)}>
                {t("editShort")}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="h-10 px-4 text-[14px]"
                disabled={remove.isPending}
                onClick={() => window.confirm(t("confirmDelete")) && remove.mutate({ id: p.id })}
              >
                {t("delete")}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
