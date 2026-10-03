"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { BusinessUnit, ShopUnit } from "@hajj/core";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";
import { FormError } from "./form-error";
import { Button, Field, SelectField } from "./ui";

export const EXPENSE_CATEGORIES = [
  "supplies",
  "transport",
  "rent",
  "utility",
  "wages",
  "food",
  "repair",
  "marketing",
  "visa",
  "fees",
  "other",
] as const;
const METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"] as const;

/**
 * Record money going out. In a shop it goes through the shop's own procedure
 * (so a shop login can use it); elsewhere through the office books.
 */
export function ExpenseForm({
  unit,
  shop,
  today,
  canBackdate,
  units,
}: {
  unit: BusinessUnit;
  shop: boolean;
  today: string;
  canBackdate: boolean;
  /** Office books may pick the unit; a shop always records to itself. */
  units?: BusinessUnit[];
}) {
  const t = useTranslations("shop.daily");
  const tp = useTranslations("shop.pos");
  const tm = useTranslations("methods");
  const tu = useTranslations("units");
  const te = useTranslations("expenses");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const done = { onSuccess: () => (form.current?.reset(), router.refresh()) };
  const shopExpense = useMutation(trpc.shop.expense.mutationOptions(done));
  const officeExpense = useMutation(trpc.expenses.create.mutationOptions(done));
  const m = shop ? shopExpense : officeExpense;

  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        const common = {
          category: s("category"),
          payee: s("payee") || undefined,
          amount: s("amount"),
          method,
          reference: s("reference") || undefined,
          note: s("note") || undefined,
          date: s("date") && s("date") !== today ? s("date") : undefined,
        };
        if (shop) shopExpense.mutate({ ...common, unit: unit as ShopUnit });
        else
          officeExpense.mutate({
            ...common,
            unit: (s("unit") || unit) as BusinessUnit,
            currency: (s("currency") || "BDT") as "BDT" | "SAR",
          });
      }}
    >
      <SelectField
        id="ex-cat"
        name="category"
        required
        label={t("category")}
        defaultValue="supplies"
      >
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {te(`categories.${c}`)}
          </option>
        ))}
      </SelectField>
      <Field id="ex-amount" name="amount" required inputMode="decimal" label={t("amount")} />
      <Field id="ex-payee" name="payee" label={t("payee")} />
      {units ? (
        <SelectField id="ex-unit" name="unit" label={te("unit")} defaultValue={unit}>
          {units.map((u) => (
            <option key={u} value={u}>
              {tu(u)}
            </option>
          ))}
        </SelectField>
      ) : null}
      {!shop ? (
        <SelectField id="ex-cur" name="currency" label={te("currency")} defaultValue="BDT">
          <option value="BDT">BDT ৳</option>
          <option value="SAR">SAR ﷼</option>
        </SelectField>
      ) : null}
      <SelectField
        id="ex-method"
        label={tp("method")}
        value={method}
        onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
      >
        {METHODS.map((x) => (
          <option key={x} value={x}>
            {tm(x)}
          </option>
        ))}
      </SelectField>
      {method !== "cash" ? <Field id="ex-ref" name="reference" label={tp("reference")} /> : null}
      <Field id="ex-note" name="note" label={tp("note")} />
      {canBackdate ? (
        <Field
          id="ex-date"
          name="date"
          type="date"
          max={today}
          defaultValue={today}
          label={tp("date")}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        <FormError error={m.error} />
        <Button type="submit" disabled={m.isPending} className="self-start">
          {t("addExpense")}
        </Button>
      </div>
    </form>
  );
}
