"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { BUSINESS_UNITS, type BusinessUnit } from "@hajj/core/statement";
import { Button, Field } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "agency"}-${crypto.randomUUID().slice(0, 6)}`;
}

export function OnboardingForm() {
  const t = useTranslations();
  const locale = useLocale() as "bn" | "en";
  const router = useRouter();
  const trpc = useTRPC();
  const initialize = useMutation(trpc.tenant.initialize.mutationOptions());
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("agencyName")).trim();
    setPending(true);
    setError(undefined);
    try {
      const { data: org, error: orgError } = await authClient.organization.create({ name, slug: slugify(name) });
      if (orgError || !org) throw new Error(orgError?.message ?? "ORG_CREATE_FAILED");
      await authClient.organization.setActive({ organizationId: org.id });
      await initialize.mutateAsync({
        organizationId: org.id,
        legalName: String(form.get("legalName") || name).trim(),
        licenseNumber: String(form.get("licenseNumber") || "").trim() || undefined,
        referencePrefix: String(form.get("prefix")).trim().toUpperCase(),
        defaultLocale: locale,
        enabledUnits: form.getAll("units") as BusinessUnit[],
      });
      router.replace("/app");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="agencyName" name="agencyName" required label={t("onboarding.agencyName")} />
      <Field id="legalName" name="legalName" label={t("onboarding.legalName")} />
      <Field id="licenseNumber" name="licenseNumber" label={t("onboarding.licenseNumber")} />
      <Field
        id="prefix"
        name="prefix"
        required
        defaultValue="HJ"
        pattern="[A-Za-z]{2,5}"
        maxLength={5}
        className="uppercase"
        label={t("onboarding.prefix")}
        hint={t("onboarding.prefixHint")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{t("onboarding.units")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_UNITS.map((unit) => (
            <label
              key={unit}
              className="flex h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-paper px-3 has-[:checked]:border-ink"
            >
              <input
                type="checkbox"
                name="units"
                value={unit}
                defaultChecked={unit === "hajj" || unit === "office"}
                className="h-4 w-4 accent-[var(--color-zamzam)]"
              />
              <span className="text-[15px]">{t(`units.${unit}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-due">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("onboarding.done")}
      </Button>
    </form>
  );
}
