"use client";

import { useTranslations } from "next-intl";
import { SearchIcon } from "@/components/icons";

export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  const t = useTranslations();
  return (
    <form method="get" className="animate-rise" role="search">
      <label className="flex h-[62px] items-center gap-3.5 rounded-lg border-[1.5px] border-line-strong bg-paper px-5 focus-within:border-haram focus-within:shadow-[0_0_0_4px_var(--color-haram-tint)]">
        <SearchIcon size={24} className="text-haram" />
        <input
          name="q"
          defaultValue={defaultValue}
          autoFocus
          aria-label={t("common.search")}
          placeholder={t("pilgrims.searchHint")}
          className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-3/70"
        />
        <kbd className="hidden rounded-md bg-ground px-2 py-0.5 font-mono text-xs text-ink-3 sm:block">↵</kbd>
      </label>
    </form>
  );
}
