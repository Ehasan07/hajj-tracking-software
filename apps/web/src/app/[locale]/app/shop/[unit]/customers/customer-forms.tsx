"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { money, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

export interface RouteOption {
  id: string;
  label: string;
}

export interface CustomerValues {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  area: string | null;
  routeId: string | null;
  sortOrder: number;
  active: boolean;
}

export function CustomerForm({
  unit,
  routes,
  initial,
}: {
  unit: ShopUnit;
  routes: RouteOption[];
  initial?: CustomerValues;
}) {
  const t = useTranslations("shop.customers");
  const tc = useTranslations("common");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);
  const save = useMutation(
    trpc.shop.saveCustomer.mutationOptions({
      onSuccess: () => {
        if (!initial) form.current?.reset();
        setSaved(true);
        router.refresh();
      },
    }),
  );
  const isShop = unit === "zamzam";
  return (
    <form
      ref={form}
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
          phone: s("phone") || undefined,
          address: s("address") || undefined,
          area: s("area") || undefined,
          routeId: s("routeId") || null,
          openingDue: initial ? undefined : s("openingDue") || undefined,
          sortOrder: Number(s("sortOrder") || 0),
          active: initial ? f.get("active") === "on" : true,
        });
      }}
    >
      <Field
        id="cf-name"
        name="name"
        required
        label={isShop ? t("shopName") : t("name")}
        defaultValue={initial?.name}
      />
      <Field
        id="cf-phone"
        name="phone"
        inputMode="tel"
        label={t("phone")}
        defaultValue={initial?.phone ?? ""}
      />
      <Field id="cf-area" name="area" label={t("area")} defaultValue={initial?.area ?? ""} />
      <Field
        id="cf-address"
        name="address"
        label={t("address")}
        defaultValue={initial?.address ?? ""}
      />
      {routes.length ? (
        <>
          <SelectField
            id="cf-route"
            name="routeId"
            label={t("route")}
            defaultValue={initial?.routeId ?? ""}
          >
            <option value="">{t("noRoute")}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </SelectField>
          <Field
            id="cf-order"
            name="sortOrder"
            type="number"
            min={0}
            label={t("sortOrder")}
            defaultValue={initial?.sortOrder ?? 0}
          />
        </>
      ) : null}
      {!initial ? (
        <Field
          id="cf-due"
          name="openingDue"
          inputMode="decimal"
          label={t("openingDue")}
          hint={t("openingDueHint")}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        {initial ? (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial.active}
              className="h-5 w-5 accent-haram"
            />
            <span className="font-semibold">{t("active")}</span>
          </label>
        ) : null}
        <FormError error={save.error} />
        {saved && !save.error ? (
          <p role="status" className="text-[14px] font-semibold text-paid">
            {tc("saved")}
          </p>
        ) : null}
        <Button type="submit" disabled={save.isPending} className="self-start">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"] as const;

export function CollectForm({
  unit,
  customerId,
  balance,
  today,
  canBackdate,
}: {
  unit: ShopUnit;
  customerId: string;
  balance: number;
  today: string;
  canBackdate: boolean;
}) {
  const t = useTranslations("shop.customers");
  const tp = useTranslations("shop.pos");
  const tm = useTranslations("methods");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const collect = useMutation(
    trpc.shop.collect.mutationOptions({
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
        collect.mutate({
          unit,
          customerId,
          amount: s("amount"),
          method,
          reference: s("reference") || undefined,
          note: s("note") || undefined,
          date: s("date") && s("date") !== today ? s("date") : undefined,
        });
      }}
    >
      <Field
        id="cl-amount"
        name="amount"
        required
        inputMode="decimal"
        label={t("amount")}
        placeholder={(balance / 100).toFixed(0)}
        hint={money(balance, locale)}
      />
      <SelectField
        id="cl-method"
        label={tp("method")}
        value={method}
        onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {tm(m)}
          </option>
        ))}
      </SelectField>
      {method !== "cash" ? <Field id="cl-ref" name="reference" label={tp("reference")} /> : null}
      <Field id="cl-note" name="note" label={tp("note")} />
      {canBackdate ? (
        <Field
          id="cl-date"
          name="date"
          type="date"
          max={today}
          defaultValue={today}
          label={tp("date")}
        />
      ) : null}
      <FormError error={collect.error} />
      <Button type="submit" disabled={collect.isPending || balance <= 0} className="self-start">
        {t("collect")}
      </Button>
    </form>
  );
}
