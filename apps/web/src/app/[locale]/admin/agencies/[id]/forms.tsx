"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { BUSINESS_UNITS, type BusinessUnit } from "@hajj/core/statement";
import { FormError } from "@/components/form-error";
import { CheckIcon } from "@/components/icons";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

const STATUSES = ["trial", "active", "past_due", "suspended", "cancelled"] as const;

export function SubscriptionForm({
  tenantId,
  plans,
  current,
}: {
  tenantId: string;
  plans: { id: string; label: string }[];
  current: {
    planId: string | null;
    status: (typeof STATUSES)[number] | null;
    cycle: "monthly" | "yearly" | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    notes: string | null;
  };
}) {
  const t = useTranslations("admin");
  const trpc = useTRPC();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const save = useMutation(
    trpc.platform.setSubscription.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        router.refresh();
      },
    }),
  );

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const f = new FormData(e.currentTarget);
    save.mutate({
      tenantId,
      planId: String(f.get("planId")),
      status: f.get("status") as (typeof STATUSES)[number],
      cycle: f.get("cycle") as "monthly" | "yearly",
      trialEndsAt: String(f.get("trialEndsAt") || "") || null,
      currentPeriodEnd: String(f.get("currentPeriodEnd") || "") || null,
      notes: String(f.get("notes") || "") || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <SelectField id="sub-plan" name="planId" defaultValue={current.planId ?? plans[0]?.id} label={t("agency.plan")}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </SelectField>
      <SelectField id="sub-status" name="status" defaultValue={current.status ?? "trial"} label={t("agency.status")}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </SelectField>
      <SelectField id="sub-cycle" name="cycle" defaultValue={current.cycle ?? "monthly"} label={t("agency.cycle")}>
        <option value="monthly">{t("agency.monthly")}</option>
        <option value="yearly">{t("agency.yearly")}</option>
      </SelectField>
      <Field id="sub-trial" name="trialEndsAt" type="date" defaultValue={current.trialEndsAt ?? ""} label={t("agency.trialEnds")} />
      <Field id="sub-period" name="currentPeriodEnd" type="date" defaultValue={current.currentPeriodEnd ?? ""} label={t("agency.periodEnd")} />
      <div className="sm:col-span-2">
        <TextAreaField id="sub-notes" name="notes" defaultValue={current.notes ?? ""} label={t("agency.notes")} className="min-h-20" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {t("agency.save")}
        </Button>
        {saved ? (
          <span className="flex items-center gap-1.5 font-semibold text-paid">
            <CheckIcon size={16} />
            {t("agency.saved")}
          </span>
        ) : null}
        <FormError error={save.error} />
      </div>
    </form>
  );
}

export function UnitsForm({ tenantId, enabled, labels }: { tenantId: string; enabled: BusinessUnit[]; labels: Record<BusinessUnit, string> }) {
  const t = useTranslations("admin");
  const trpc = useTRPC();
  const router = useRouter();
  const [units, setUnits] = useState<BusinessUnit[]>(enabled);
  const save = useMutation(trpc.platform.setUnits.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUSINESS_UNITS.map((u) => (
          <label key={u} className="flex h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-paper px-3 has-[:checked]:border-haram has-[:checked]:bg-haram-tint">
            <input
              type="checkbox"
              checked={units.includes(u)}
              onChange={(e) => setUnits(e.target.checked ? [...units, u] : units.filter((x) => x !== u))}
              className="h-4 w-4 accent-[var(--color-haram)]"
            />
            <span className="text-[15px]">{labels[u]}</span>
          </label>
        ))}
      </div>
      <FormError error={save.error} />
      <Button type="button" variant="outline" className="self-start" disabled={save.isPending || units.length === 0} onClick={() => save.mutate({ tenantId, units })}>
        {t("agency.saveUnits")}
      </Button>
    </div>
  );
}
