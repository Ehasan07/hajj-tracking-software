"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/form-error";
import { BookIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export function StarterButton() {
  const t = useTranslations("guide");
  const trpc = useTRPC();
  const router = useRouter();
  const add = useMutation(trpc.articles.addStarter.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <div className="flex max-w-md flex-col items-center gap-3">
      <Button type="button" disabled={add.isPending} onClick={() => add.mutate()}>
        <BookIcon size={20} tint="transparent" accent="var(--color-saffron)" />
        {t("addStarter")}
      </Button>
      <p className="text-[13px] text-ink-3">{t("addStarterHint")}</p>
      <FormError error={add.error} />
    </div>
  );
}
