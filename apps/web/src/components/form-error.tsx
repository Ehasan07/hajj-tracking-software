"use client";

import { useLocale, useTranslations } from "next-intl";
import { errorKey } from "@/lib/errors";
import { money, type Locale } from "@/lib/format";

/** Translated, human message for any server error. */
export function useErrorText() {
  const t = useTranslations("errors");
  const tp = useTranslations();
  const locale = useLocale() as Locale;
  return (error: unknown) => {
    if (!error) return undefined;
    const { key, arg } = errorKey(error);
    if (key === "OVERPAYMENT") return tp("payment.overpay", { due: money(Number(arg ?? 0), locale) });
    if (key === "DUPLICATE_PASSPORT") return tp("pilgrims.duplicate", { ref: arg ?? "" });
    if (key === "PLAN_LIMIT") return t("PLAN_LIMIT");
    return t(key as "generic");
  };
}

export function FormError({ error }: { error: unknown }) {
  const text = useErrorText()(error);
  if (!text) return null;
  return (
    <p role="alert" className="rounded-md bg-due-tint px-4 py-3 text-[15px] font-semibold text-due">
      {text}
    </p>
  );
}
