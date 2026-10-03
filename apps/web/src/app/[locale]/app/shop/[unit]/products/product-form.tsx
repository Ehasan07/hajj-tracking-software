"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export interface ProductValues {
  id?: string;
  name: string;
  code: string | null;
  category: string | null;
  unitLabel: string;
  price: number;
  cost: number | null;
  trackStock: boolean;
  usesBatches: boolean;
  reorderLevel: number | null;
  genericName: string | null;
  strength: string | null;
  active: boolean;
}

const DEFAULT_UNIT: Record<"bn" | "en", Record<ShopUnit, string>> = {
  bn: { medicine: "পাতা", zamzam: "জার", coffee: "কাপ", supernova: "পিস" },
  en: { medicine: "strip", zamzam: "jar", coffee: "cup", supernova: "pcs" },
};
const text = (minor: number | null) =>
  minor === null ? "" : minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);

export function ProductForm({
  unit,
  initial,
  categories,
  onDone,
}: {
  unit: ShopUnit;
  initial?: ProductValues;
  categories: string[];
  onDone?: () => void;
}) {
  const t = useTranslations("shop.products");
  const tc = useTranslations("common");
  const unitLabel = DEFAULT_UNIT[useLocale() === "en" ? "en" : "bn"][unit];
  const trpc = useTRPC();
  const router = useRouter();
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? unit !== "coffee");
  const [saved, setSaved] = useState(false);
  const save = useMutation(
    trpc.shop.saveProduct.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        router.refresh();
        onDone?.();
      },
    }),
  );

  return (
    <form
      key={initial?.id ?? "new"}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        save.mutate({
          unit,
          id: initial?.id,
          name: s("name"),
          code: s("code") || undefined,
          category: s("category") || undefined,
          unitLabel: s("unitLabel") || unitLabel,
          price: s("price") || "0",
          cost: s("cost") || undefined,
          trackStock,
          usesBatches: unit === "medicine" && trackStock && f.get("usesBatches") === "on",
          reorderLevel: s("reorderLevel") ? Number(s("reorderLevel")) : undefined,
          genericName: s("genericName") || undefined,
          strength: s("strength") || undefined,
          active: f.get("active") === "on",
        });
      }}
    >
      <Field id="pf-name" name="name" required label={t("name")} defaultValue={initial?.name} />
      {unit === "medicine" ? (
        <>
          <Field
            id="pf-generic"
            name="genericName"
            label={t("genericName")}
            defaultValue={initial?.genericName ?? ""}
          />
          <Field
            id="pf-strength"
            name="strength"
            label={t("strength")}
            defaultValue={initial?.strength ?? ""}
          />
        </>
      ) : null}
      <Field
        id="pf-category"
        name="category"
        list="pf-categories"
        label={t("category")}
        defaultValue={initial?.category ?? ""}
      />
      <datalist id="pf-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Field id="pf-code" name="code" label={t("code")} defaultValue={initial?.code ?? ""} />
      <Field
        id="pf-unit"
        name="unitLabel"
        label={t("unitLabel")}
        defaultValue={initial?.unitLabel ?? unitLabel}
      />
      <Field
        id="pf-price"
        name="price"
        required
        inputMode="decimal"
        label={t("price")}
        defaultValue={text(initial?.price ?? null)}
      />
      <Field
        id="pf-cost"
        name="cost"
        inputMode="decimal"
        label={t("cost")}
        defaultValue={text(initial?.cost ?? null)}
      />
      {trackStock ? (
        <Field
          id="pf-reorder"
          name="reorderLevel"
          type="number"
          min={0}
          label={t("reorderLevel")}
          defaultValue={initial?.reorderLevel ?? ""}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="mt-1 h-5 w-5 accent-haram"
          />
          <span className="flex flex-col">
            <span className="font-semibold">{t("trackStock")}</span>
            <span className="text-[13px] text-ink-3">{t("trackStockHint")}</span>
          </span>
        </label>
        {unit === "medicine" && trackStock ? (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="usesBatches"
              defaultChecked={initial?.usesBatches ?? true}
              disabled={Boolean(initial?.id)}
              className="mt-1 h-5 w-5 accent-haram"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{t("usesBatches")}</span>
              <span className="text-[13px] text-ink-3">{t("usesBatchesHint")}</span>
            </span>
          </label>
        ) : null}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-5 w-5 accent-haram"
          />
          <span className="font-semibold">{t("active")}</span>
        </label>
        <FormError error={save.error} />
        {saved && !save.error ? (
          <p role="status" className="text-[14px] font-semibold text-paid">
            {t("saved")}
          </p>
        ) : null}
        <Button type="submit" disabled={save.isPending} className="self-start">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
