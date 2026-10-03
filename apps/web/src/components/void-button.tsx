"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ShopUnit } from "@hajj/core";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";
import { FormError } from "./form-error";

type Target =
  | { kind: "sale"; unit: ShopUnit; id: string }
  | { kind: "shopExpense"; unit: ShopUnit; id: string }
  | { kind: "expense"; id: string };

/** Cancel with a written reason. The record stays, marked cancelled, and the money is reversed in the ledger. */
export function VoidButton({ target, label }: { target: Target; label?: string }) {
  const t = useTranslations("shop.sales");
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const options = { onSuccess: () => router.refresh() };
  const sale = useMutation(trpc.shop.voidSale.mutationOptions(options));
  const shopExpense = useMutation(trpc.shop.voidExpense.mutationOptions(options));
  const expense = useMutation(trpc.expenses.void.mutationOptions(options));
  const m = target.kind === "sale" ? sale : target.kind === "shopExpense" ? shopExpense : expense;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-md px-3 text-[13px] font-semibold text-due hover:bg-due-tint"
      >
        {label ?? t("void")}
      </button>
    );
  }
  return (
    <form
      className="flex flex-col items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (target.kind === "sale") sale.mutate({ unit: target.unit, id: target.id, reason });
        else if (target.kind === "shopExpense")
          shopExpense.mutate({ unit: target.unit, id: target.id, reason });
        else expense.mutate({ id: target.id, reason });
      }}
    >
      <input
        autoFocus
        required
        minLength={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("voidReason")}
        aria-label={t("voidReason")}
        className="h-10 w-56 rounded-md border-[1.5px] border-due px-3 text-[14px] outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md px-3 text-[13px] text-ink-2"
        >
          ✕
        </button>
        <button
          type="submit"
          disabled={m.isPending}
          className="h-9 rounded-md bg-due px-3 text-[13px] font-semibold text-white"
        >
          {t("confirmVoid")}
        </button>
      </div>
      <FormError error={m.error} />
    </form>
  );
}
