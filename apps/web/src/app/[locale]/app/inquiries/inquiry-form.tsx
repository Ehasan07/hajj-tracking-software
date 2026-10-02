"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export function InquiryForm({ packages }: { packages: { id: string; name: string }[] }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const create = useMutation(
    trpc.inquiries.create.mutationOptions({
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
        create.mutate({
          name: String(f.get("name")),
          phone: String(f.get("phone")),
          interest: f.get("interest") as "hajj" | "umrah" | "other",
          packageId: String(f.get("packageId") || "") || undefined,
          partySize: Number(f.get("partySize") || 1),
          notes: String(f.get("notes") || ""),
          followUpOn: String(f.get("followUpOn") || "") || undefined,
        });
      }}
    >
      <Field id="iq-name" name="name" required minLength={2} autoComplete="off" label={t("inquiries.name")} />
      <Field id="iq-phone" name="phone" required inputMode="tel" placeholder="01XXX-XXXXXX" label={t("inquiries.phone")} />
      <SelectField id="iq-interest" name="interest" label={t("inquiries.interest")} defaultValue="hajj">
        <option value="hajj">{t("interest.hajj")}</option>
        <option value="umrah">{t("interest.umrah")}</option>
        <option value="other">{t("interest.other")}</option>
      </SelectField>
      <SelectField id="iq-package" name="packageId" label={t("inquiries.package")} defaultValue="">
        <option value="">{t("inquiries.anyPackage")}</option>
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectField>
      <Field id="iq-party" name="partySize" type="number" min={1} max={100} defaultValue={1} label={t("inquiries.partySize")} />
      <Field id="iq-follow" name="followUpOn" type="date" label={t("inquiries.followUpOn")} />
      <div className="sm:col-span-2">
        <TextAreaField id="iq-notes" name="notes" label={t("inquiries.notes")} />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError error={create.error} />
        <Button type="submit" disabled={create.isPending} className="self-start">
          {t("inquiries.save")}
        </Button>
      </div>
    </form>
  );
}

export function InquiryActions({ id, status }: { id: string; status: "new" | "follow_up" | "converted" | "closed" }) {
  const t = useTranslations("inquiries");
  const trpc = useTRPC();
  const router = useRouter();
  const update = useMutation(trpc.inquiries.update.mutationOptions({ onSuccess: () => router.refresh() }));
  if (status === "converted") return null;
  return status === "closed" ? (
    <button
      type="button"
      disabled={update.isPending}
      onClick={() => update.mutate({ id, status: "new" })}
      className="h-10 rounded-md px-3 text-sm font-semibold text-ink-2 hover:bg-ground"
    >
      {t("reopen")}
    </button>
  ) : (
    <button
      type="button"
      disabled={update.isPending}
      onClick={() => update.mutate({ id, status: "closed" })}
      className="h-10 rounded-md px-3 text-sm font-semibold text-ink-2 hover:bg-ground"
    >
      {t("close")}
    </button>
  );
}
