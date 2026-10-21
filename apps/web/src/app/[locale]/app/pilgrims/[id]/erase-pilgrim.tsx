"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { DangerZone } from "@/components/danger-zone";
import { useRouter } from "@/i18n/navigation";
import { erasePilgrim } from "./erase-action";

export function ErasePilgrim({ id, reference }: { id: string; reference: string }) {
  const t = useTranslations("erase.pilgrim");
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <DangerZone
      id="erase-pilgrim"
      title={t("title")}
      body={t("body")}
      button={t("button")}
      confirm={t("confirm")}
      typeLabel={t("confirmLabel", { ref: reference })}
      error={error}
      pending={pending}
      onConfirm={(typed) =>
        start(async () => {
          const result = await erasePilgrim(id, typed);
          if ("error" in result) setError(result.error);
          else router.refresh();
        })
      }
    />
  );
}
