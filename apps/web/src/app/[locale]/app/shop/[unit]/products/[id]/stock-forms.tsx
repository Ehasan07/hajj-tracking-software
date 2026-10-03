"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export function ReceiveStockForm({
  unit,
  productId,
  usesBatches,
  today,
}: {
  unit: ShopUnit;
  productId: string;
  usesBatches: boolean;
  today: string;
}) {
  const t = useTranslations("shop.products");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const receive = useMutation(
    trpc.shop.receiveStock.mutationOptions({
      onSuccess: () => {
        form.current?.reset();
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        receive.mutate({
          unit,
          productId,
          qty: Number(s("qty")),
          batchNo: s("batchNo") || undefined,
          expiresOn: s("expiresOn") || undefined,
          cost: s("cost") || undefined,
        });
      }}
    >
      <Field id="rs-qty" name="qty" type="number" min={1} required label={t("qty")} />
      {usesBatches ? (
        <>
          <Field id="rs-batch" name="batchNo" required label={t("batchNo")} />
          <Field
            id="rs-exp"
            name="expiresOn"
            type="date"
            required
            min={today}
            label={t("expiresOn")}
          />
        </>
      ) : null}
      <Field id="rs-cost" name="cost" inputMode="decimal" label={t("cost")} />
      <FormError error={receive.error} />
      <Button type="submit" disabled={receive.isPending} className="self-start">
        {t("receive")}
      </Button>
    </form>
  );
}

export function AdjustStockForm({
  unit,
  productId,
  batches,
}: {
  unit: ShopUnit;
  productId: string;
  batches: { id: string; label: string }[] | null;
}) {
  const t = useTranslations("shop.products");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const adjust = useMutation(
    trpc.shop.adjustStock.mutationOptions({
      onSuccess: () => {
        form.current?.reset();
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        adjust.mutate({
          unit,
          productId,
          batchId: String(f.get("batchId") || "") || undefined,
          qty: Number(String(f.get("qty")).replace("−", "-")),
          note: String(f.get("note") ?? "").trim(),
        });
      }}
    >
      {batches ? (
        <SelectField id="as-batch" name="batchId" required label={t("batch")}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </SelectField>
      ) : null}
      <Field
        id="as-qty"
        name="qty"
        type="number"
        step={1}
        required
        placeholder="-2"
        label={t("adjustQty")}
      />
      <Field id="as-note" name="note" required minLength={3} label={t("reason")} />
      <FormError error={adjust.error} />
      <Button type="submit" variant="outline" disabled={adjust.isPending} className="self-start">
        {t("adjust")}
      </Button>
    </form>
  );
}
