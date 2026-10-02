"use client";

import { useTranslations } from "next-intl";
import { PrintIcon } from "./icons";
import { buttonClass } from "./ui";

export function PrintButton() {
  const t = useTranslations("common");
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("saffron")}>
      <PrintIcon size={20} tint="var(--color-saffron-tint)" />
      {t("print")}
    </button>
  );
}
