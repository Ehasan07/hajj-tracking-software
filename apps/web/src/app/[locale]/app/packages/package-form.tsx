"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export function PackageForm() {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const create = useMutation(
    trpc.packages.create.mutationOptions({
      onSuccess: () => {
        form.current?.reset();
        router.refresh();
      },
    }),
  );

  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const days = Number(f.get("days"));
        create.mutate({
          kind: f.get("kind") as "hajj" | "umrah",
          name: String(f.get("name")),
          season: String(f.get("season")),
          price: String(f.get("price")),
          days: days > 0 ? days : undefined,
          notes: String(f.get("notes") || "") || undefined,
        });
      }}
    >
      <SelectField id="kind" name="kind" label={t("packages.kind")} defaultValue="hajj">
        <option value="hajj">{t("interest.hajj")}</option>
        <option value="umrah">{t("interest.umrah")}</option>
      </SelectField>
      <Field id="name" name="name" required minLength={2} label={t("packages.name")} />
      <Field id="season" name="season" required label={t("packages.season")} hint={t("packages.seasonHint")} />
      <Field id="price" name="price" required inputMode="decimal" label={t("packages.price")} className="tabular font-bold" />
      <Field id="days" name="days" type="number" min={1} max={120} label={t("packages.days")} />
      <div className="sm:col-span-2">
        <TextAreaField id="notes" name="notes" label={t("packages.notes")} />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError error={create.error} />
        <Button type="submit" disabled={create.isPending} className="self-start">
          {t("packages.save")}
        </Button>
      </div>
    </form>
  );
}

export function PackageToggle({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("packages");
  const trpc = useTRPC();
  const router = useRouter();
  const toggle = useMutation(trpc.packages.setActive.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <button
      type="button"
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ id, active: !active })}
      className="h-10 rounded-md px-3 text-sm font-semibold text-haram hover:bg-haram-tint"
    >
      {active ? t("deactivate") : t("activate")}
    </button>
  );
}
