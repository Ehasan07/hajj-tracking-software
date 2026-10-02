"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { parsePassportMrz, type PassportMrz } from "@hajj/core/mrz";
import { FormError } from "@/components/form-error";
import { CheckIcon, PassportIcon } from "@/components/icons";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { errorKey } from "@/lib/errors";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

interface Prefill {
  inquiryId?: string;
  inquiryRef?: string;
  name?: string;
  phone?: string;
  packageId?: string;
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function PilgrimForm({
  packages,
  prefill,
}: {
  packages: { id: string; label: string }[];
  prefill: Prefill;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [fullName, setFullName] = useState(prefill.name ?? "");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [nationality, setNationality] = useState("BGD");
  const [mrzState, setMrzState] = useState<"idle" | "ok" | "format" | "check">("idle");
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);

  const create = useMutation(
    trpc.pilgrims.create.mutationOptions({
      onSuccess: (row) => router.replace(`/app/pilgrims/${row.id}`),
    }),
  );
  const duplicate = create.error && errorKey(create.error).key === "DUPLICATE_PASSPORT";

  function applyMrz(raw: string) {
    if (raw.replace(/\s/g, "").length < 80) {
      setMrzState("idle");
      return;
    }
    const result = parsePassportMrz(raw);
    if (!result.ok) {
      setMrzState(result.error === "FORMAT" ? "format" : "check");
      return;
    }
    const m: PassportMrz = result.value;
    setFullName(titleCase(`${m.givenNames} ${m.surname}`.trim()));
    setPassportNumber(m.passportNumber);
    setPassportExpiry(m.expiryDate);
    setDateOfBirth(m.dateOfBirth);
    if (m.sex === "M") setGender("male");
    if (m.sex === "F") setGender("female");
    setNationality(m.nationality);
    setMrzState("ok");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim() || undefined;
    const input = {
      fullName,
      fatherName: text("fatherName"),
      motherName: text("motherName"),
      spouseName: text("spouseName"),
      nidNumber: text("nidNumber") ?? "",
      permanentAddress: text("permanentAddress"),
      bloodGroup: text("bloodGroup") as "A+" | undefined,
      prpNumber: text("prpNumber"),
      phone: String(f.get("phone") ?? ""),
      altPhone: text("altPhone") ?? "",
      email: text("email") ?? "",
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      address: text("address"),
      district: text("district"),
      emergencyName: text("emergencyName"),
      emergencyPhone: text("emergencyPhone") ?? "",
      notes: text("notes"),
      packageId: String(f.get("packageId")),
      discount: text("discount"),
      passportNumber: passportNumber || undefined,
      passportExpiry: passportExpiry || undefined,
      nationality: nationality || undefined,
      inquiryId: prefill.inquiryId,
    };
    setPending(input);
    create.mutate(input);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-12">
      <section className="flex flex-col gap-5 rounded-lg bg-paper p-6 lg:col-span-7">
        <h2 className="text-lg font-bold">{t("pilgrims.personal")}</h2>
        <Field id="fullName" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} label={t("pilgrims.fullName")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fatherName" name="fatherName" label={t("pilgrims.fatherName")} />
          <Field id="motherName" name="motherName" label={t("profile.motherName")} />
          <Field id="spouseName" name="spouseName" label={t("profile.spouseName")} />
          <Field id="nidNumber" name="nidNumber" inputMode="numeric" label={t("profile.nid")} hint={t("profile.nidHint")} className="font-mono" />
          <Field id="phone" name="phone" required inputMode="tel" defaultValue={prefill.phone} placeholder="01XXX-XXXXXX" label={t("pilgrims.phone")} />
          <Field id="altPhone" name="altPhone" inputMode="tel" label={t("pilgrims.altPhone")} />
          <Field id="email" name="email" type="email" label={t("pilgrims.email")} />
          <SelectField id="gender" value={gender} onChange={(e) => setGender(e.target.value as "male")} label={t("pilgrims.gender")}>
            <option value="">—</option>
            <option value="male">{t("pilgrims.male")}</option>
            <option value="female">{t("pilgrims.female")}</option>
          </SelectField>
          <Field id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} label={t("pilgrims.dob")} />
        </div>
        <TextAreaField id="address" name="address" label={t("profile.presentAddress")} className="min-h-20" />
        <TextAreaField id="permanentAddress" name="permanentAddress" label={t("profile.permanentAddress")} className="min-h-20" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="district" name="district" label={t("pilgrims.district")} />
          <SelectField id="bloodGroup" name="bloodGroup" defaultValue="" label={t("profile.bloodGroup")}>
            <option value="">—</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </SelectField>
          <Field id="prpNumber" name="prpNumber" label={t("profile.prp")} className="font-mono" />
        </div>
        <h3 className="pt-2 text-base font-bold">{t("pilgrims.emergency")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="emergencyName" name="emergencyName" label={t("pilgrims.emergencyName")} />
          <Field id="emergencyPhone" name="emergencyPhone" inputMode="tel" label={t("pilgrims.emergencyPhone")} />
        </div>
        <TextAreaField id="notes" name="notes" label={t("pilgrims.notes")} className="min-h-20" />
      </section>

      <div className="flex flex-col gap-6 lg:col-span-5">
        <section className="flex flex-col gap-4 rounded-lg bg-paper p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-11 items-center justify-center rounded-[22px_22px_8px_8px] bg-haram-tint">
              <PassportIcon size={26} tint="var(--color-paper)" accent="var(--color-haram)" />
            </span>
            <h2 className="text-lg font-bold">{t("pilgrims.passportSection")}</h2>
          </div>
          <TextAreaField
            id="mrz"
            spellCheck={false}
            autoCapitalize="characters"
            onChange={(e) => applyMrz(e.target.value)}
            label={t("pilgrims.mrz")}
            hint={t("pilgrims.mrzHint")}
            placeholder={"P<BGD…<<…\nA01234567…"}
            className="font-mono text-[13px] leading-6 tracking-wider uppercase"
            error={mrzState === "format" ? t("errors.mrz_FORMAT") : mrzState === "check" ? t("errors.mrz_CHECK") : undefined}
          />
          {mrzState === "ok" ? (
            <p className="flex animate-rise items-center gap-2 rounded-md bg-paid-tint px-4 py-3 text-[15px] font-semibold text-paid">
              <CheckIcon size={18} />
              {t("pilgrims.mrzOk")}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="passportNumber"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
              className="font-mono tracking-wider"
              label={t("pilgrims.passportNumber")}
            />
            <Field id="passportExpiry" type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} label={t("pilgrims.passportExpiry")} />
            <Field id="nationality" maxLength={3} value={nationality} onChange={(e) => setNationality(e.target.value.toUpperCase())} label={t("pilgrims.nationality")} />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-lg bg-paper p-6">
          <SelectField id="packageId" name="packageId" required defaultValue={prefill.packageId ?? ""} label={t("pilgrims.package")}>
            <option value="" disabled>
              {t("pilgrims.choosePackage")}
            </option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <Field id="discount" name="discount" inputMode="decimal" label={t("pilgrims.discount")} hint={t("common.optional")} />
          {duplicate ? (
            <div className="flex flex-col gap-3 rounded-md bg-saffron-tint p-4">
              <FormError error={create.error} />
              <Button
                type="button"
                variant="saffron"
                disabled={create.isPending}
                onClick={() => pending && create.mutate({ ...(pending as Parameters<typeof create.mutate>[0]), allowDuplicatePassport: true })}
              >
                {t("pilgrims.confirmDuplicate")}
              </Button>
            </div>
          ) : (
            <FormError error={create.error} />
          )}
          <Button type="submit" disabled={create.isPending} className="h-14 text-lg">
            {t("pilgrims.save")}
          </Button>
        </section>
      </div>
    </form>
  );
}
