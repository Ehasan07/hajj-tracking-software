"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { BUSINESS_UNITS, type BusinessUnit } from "@hajj/core/statement";
import { FormError } from "@/components/form-error";
import { Button, Field } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export interface PlanDraft {
  id?: string;
  code: string;
  nameBn: string;
  nameEn: string;
  taglineBn: string;
  taglineEn: string;
  priceMonthly: string;
  priceYearly: string;
  pilgrimsPerYear: number | null;
  staffSeats: number | null;
  smsPerMonth: number | null;
  units: BusinessUnit[];
  customDomain: boolean;
  sortOrder: number;
  active: boolean;
}

export function PlanForm({ plan, unitLabels, onDone }: { plan: PlanDraft; unitLabels: Record<BusinessUnit, string>; onDone?: () => void }) {
  const t = useTranslations("admin.plans");
  const trpc = useTRPC();
  const router = useRouter();
  const [units, setUnits] = useState<BusinessUnit[]>(plan.units);
  const save = useMutation(
    trpc.platform.savePlan.mutationOptions({
      onSuccess: () => {
        onDone?.();
        router.refresh();
      },
    }),
  );
  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s ? Number(s) : null;
  };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save.mutate({
      id: plan.id,
      code: String(f.get("code")),
      nameBn: String(f.get("nameBn")),
      nameEn: String(f.get("nameEn")),
      taglineBn: String(f.get("taglineBn") ?? ""),
      taglineEn: String(f.get("taglineEn") ?? ""),
      priceMonthly: String(f.get("priceMonthly")),
      priceYearly: String(f.get("priceYearly")),
      pilgrimsPerYear: num(f.get("pilgrimsPerYear")),
      staffSeats: num(f.get("staffSeats")),
      smsPerMonth: num(f.get("smsPerMonth")),
      units,
      customDomain: f.get("customDomain") === "on",
      sortOrder: Number(f.get("sortOrder") || 0),
      active: f.get("active") === "on",
    });
  }

  const p = plan.id ?? "new";
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field id={`${p}-code`} name="code" required defaultValue={plan.code} pattern="[a-z][a-z0-9_-]{1,30}" label={t("code")} className="font-mono" />
      <Field id={`${p}-sort`} name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} label={t("sort")} />
      <Field id={`${p}-nameBn`} name="nameBn" required defaultValue={plan.nameBn} label={t("nameBn")} />
      <Field id={`${p}-nameEn`} name="nameEn" required defaultValue={plan.nameEn} label={t("nameEn")} />
      <Field id={`${p}-tagBn`} name="taglineBn" defaultValue={plan.taglineBn} label={t("taglineBn")} />
      <Field id={`${p}-tagEn`} name="taglineEn" defaultValue={plan.taglineEn} label={t("taglineEn")} />
      <Field id={`${p}-monthly`} name="priceMonthly" required inputMode="decimal" defaultValue={plan.priceMonthly} label={t("monthly")} className="tabular font-bold" />
      <Field id={`${p}-yearly`} name="priceYearly" required inputMode="decimal" defaultValue={plan.priceYearly} label={t("yearly")} className="tabular font-bold" />
      <Field id={`${p}-pilgrims`} name="pilgrimsPerYear" type="number" min={1} defaultValue={plan.pilgrimsPerYear ?? ""} label={t("pilgrims")} hint={t("unlimitedHint")} />
      <Field id={`${p}-staff`} name="staffSeats" type="number" min={1} defaultValue={plan.staffSeats ?? ""} label={t("staff")} hint={t("unlimitedHint")} />
      <Field id={`${p}-sms`} name="smsPerMonth" type="number" min={0} defaultValue={plan.smsPerMonth ?? ""} label={t("sms")} hint={t("unlimitedHint")} />
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">{t("units")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_UNITS.map((u) => (
            <label key={u} className="flex h-11 cursor-pointer items-center gap-3 rounded-md border border-line bg-paper px-3 has-[:checked]:border-haram has-[:checked]:bg-haram-tint">
              <input
                type="checkbox"
                checked={units.includes(u)}
                onChange={(e) => setUnits(e.target.checked ? [...units, u] : units.filter((x) => x !== u))}
                className="h-4 w-4 accent-[var(--color-haram)]"
              />
              <span className="text-[14px]">{unitLabels[u]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex h-11 items-center gap-3 text-[15px] font-semibold">
        <input type="checkbox" name="customDomain" defaultChecked={plan.customDomain} className="h-5 w-5 accent-[var(--color-haram)]" />
        {t("customDomain")}
      </label>
      <label className="flex h-11 items-center gap-3 text-[15px] font-semibold">
        <input type="checkbox" name="active" defaultChecked={plan.active} className="h-5 w-5 accent-[var(--color-haram)]" />
        {t("active")}
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError error={save.error} />
        <Button type="submit" disabled={save.isPending || units.length === 0} className="self-start">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

export function EditToggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="border-t border-dashed border-line pt-4">{children}</div>
  ) : (
    <Button type="button" variant="outline" className="h-10 self-start px-4 text-sm" onClick={() => setOpen(true)}>
      {label}
    </Button>
  );
}
