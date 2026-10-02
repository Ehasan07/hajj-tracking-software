"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { submitInquiry, type InquiryState } from "./actions";

export function InquiryForm({
  packages,
  selectedPackage,
}: {
  packages: { id: string; name: string }[];
  selectedPackage?: string;
}) {
  const t = useTranslations("site.inquiry");
  const ti = useTranslations("interest");
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, { status: "idle" });

  if (state.status === "ok") {
    return (
      <div role="status" className="flex animate-rise flex-col items-center gap-4 rounded-lg bg-paid-tint px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paid text-white">
          <CheckIcon size={32} />
        </span>
        <p className="max-w-sm text-lg font-semibold text-paid">{t("ok", { ref: state.ref })}</p>
      </div>
    );
  }

  const v = state.status === "error" ? state.values : {};
  return (
    // Re-keyed after each failed attempt so the refilled values become the inputs' defaults.
    <form key={state.status === "error" ? JSON.stringify(v) : "fresh"} action={action} className="grid gap-4 sm:grid-cols-2">
      <Field id="site-name" name="name" required minLength={2} autoComplete="name" defaultValue={v.name} label={t("name")} />
      <Field id="site-phone" name="phone" required inputMode="tel" autoComplete="tel" placeholder="01XXX-XXXXXX" defaultValue={v.phone} label={t("phone")} />
      <SelectField id="site-interest" name="interest" defaultValue={v.interest ?? "hajj"} label={t("interest")}>
        <option value="hajj">{ti("hajj")}</option>
        <option value="umrah">{ti("umrah")}</option>
        <option value="other">{ti("other")}</option>
      </SelectField>
      <SelectField id="site-package" name="packageId" defaultValue={v.packageId ?? selectedPackage ?? ""} label={t("package")}>
        <option value="">{t("anyPackage")}</option>
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectField>
      <Field id="site-people" name="partySize" type="number" min={1} max={50} defaultValue={v.partySize ?? 1} label={t("people")} />
      <div className="sm:col-span-2">
        <TextAreaField id="site-notes" name="notes" maxLength={1000} defaultValue={v.notes} label={t("notes")} className="min-h-24" />
      </div>
      {/* Honeypot: hidden from people and screen readers, filled only by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="site-website">Website</label>
        <input id="site-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.status === "error" ? (
        <p role="alert" className="rounded-md bg-due-tint px-4 py-3 text-[15px] font-semibold text-due sm:col-span-2">
          {t(state.code)}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-14 text-lg sm:col-span-2">
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
