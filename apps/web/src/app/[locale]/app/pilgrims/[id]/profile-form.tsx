"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { CheckIcon } from "@/components/icons";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export interface ProfileValues {
  fullName: string;
  fatherName: string | null;
  motherName: string | null;
  spouseName: string | null;
  phone: string;
  altPhone: string | null;
  email: string | null;
  gender: "male" | "female" | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  occupation: string | null;
  address: string | null;
  permanentAddress: string | null;
  district: string | null;
  prpNumber: string | null;
  hajjRegNumber: string | null;
  visaNumber: string | null;
  mahramName: string | null;
  mahramRelation: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
}

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/** E.164 back to the local form people type. */
function localPhone(v: string | null) {
  return v?.startsWith("+880") ? `0${v.slice(4)}` : (v ?? "");
}

export function ProfileForm({ id, values, nidMasked }: { id: string; values: ProfileValues; nidMasked: string | null }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState(values.gender ?? "");
  const update = useMutation(
    trpc.pilgrims.update.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
    }),
  );

  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-11 self-start" onClick={() => setOpen(true)}>
        {t("profile.edit")}
      </Button>
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const opt = (k: string) => v(k) || undefined;
    update.mutate({
      id,
      fullName: v("fullName"),
      fatherName: opt("fatherName"),
      motherName: opt("motherName"),
      spouseName: opt("spouseName"),
      phone: v("phone"),
      altPhone: v("altPhone"),
      email: v("email"),
      gender: (gender || undefined) as "male" | "female" | undefined,
      dateOfBirth: opt("dateOfBirth"),
      bloodGroup: (opt("bloodGroup") as (typeof BLOOD)[number] | undefined) ?? undefined,
      occupation: opt("occupation"),
      address: opt("address"),
      permanentAddress: opt("permanentAddress"),
      district: opt("district"),
      nidNumber: v("nidNumber"),
      prpNumber: opt("prpNumber"),
      hajjRegNumber: opt("hajjRegNumber"),
      visaNumber: opt("visaNumber"),
      mahramName: opt("mahramName"),
      mahramRelation: opt("mahramRelation"),
      emergencyName: opt("emergencyName"),
      emergencyPhone: v("emergencyPhone"),
      notes: opt("notes"),
    });
  }

  const section = "flex flex-col gap-4 border-t border-dashed border-line pt-4";
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-fullName" name="fullName" required defaultValue={values.fullName} label={t("pilgrims.fullName")} />
        <Field id="pf-phone" name="phone" required inputMode="tel" defaultValue={localPhone(values.phone)} label={t("pilgrims.phone")} />
        <SelectField id="pf-gender" value={gender} onChange={(e) => setGender(e.target.value)} label={t("pilgrims.gender")}>
          <option value="">—</option>
          <option value="male">{t("pilgrims.male")}</option>
          <option value="female">{t("pilgrims.female")}</option>
        </SelectField>
        <Field id="pf-dob" name="dateOfBirth" type="date" defaultValue={values.dateOfBirth ?? ""} label={t("pilgrims.dob")} />
      </div>

      <div className={section}>
        <b>{t("profile.family")}</b>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-father" name="fatherName" defaultValue={values.fatherName ?? ""} label={t("pilgrims.fatherName")} />
          <Field id="pf-mother" name="motherName" defaultValue={values.motherName ?? ""} label={t("profile.motherName")} />
          <Field id="pf-spouse" name="spouseName" defaultValue={values.spouseName ?? ""} label={t("profile.spouseName")} />
        </div>
      </div>

      <div className={section}>
        <b>{t("profile.identity")}</b>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pf-nid"
            name="nidNumber"
            inputMode="numeric"
            placeholder={nidMasked ?? ""}
            label={t("profile.nid")}
            hint={t("profile.nidHint")}
            className="font-mono"
          />
          <Field id="pf-prp" name="prpNumber" defaultValue={values.prpNumber ?? ""} label={t("profile.prp")} className="font-mono" />
          <Field id="pf-reg" name="hajjRegNumber" defaultValue={values.hajjRegNumber ?? ""} label={t("profile.hajjReg")} className="font-mono" />
          <Field id="pf-visa" name="visaNumber" defaultValue={values.visaNumber ?? ""} label={t("profile.visa")} className="font-mono" />
        </div>
      </div>

      {gender === "female" ? (
        <div className={section}>
          <b>{t("profile.mahram")}</b>
          <p className="-mt-2 text-[13px] text-ink-3">{t("profile.mahramHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-mahram" name="mahramName" defaultValue={values.mahramName ?? ""} label={t("profile.mahramName")} />
            <Field id="pf-mahram-rel" name="mahramRelation" defaultValue={values.mahramRelation ?? ""} label={t("profile.mahramRelation")} />
          </div>
        </div>
      ) : null}

      <div className={section}>
        <b>{t("profile.other")}</b>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="pf-blood" name="bloodGroup" defaultValue={values.bloodGroup ?? ""} label={t("profile.bloodGroup")}>
            <option value="">—</option>
            {BLOOD.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </SelectField>
          <Field id="pf-occupation" name="occupation" defaultValue={values.occupation ?? ""} label={t("profile.occupation")} />
          <Field id="pf-alt" name="altPhone" inputMode="tel" defaultValue={localPhone(values.altPhone)} label={t("pilgrims.altPhone")} />
          <Field id="pf-email" name="email" type="email" defaultValue={values.email ?? ""} label={t("pilgrims.email")} />
          <Field id="pf-district" name="district" defaultValue={values.district ?? ""} label={t("pilgrims.district")} />
        </div>
        <TextAreaField id="pf-address" name="address" defaultValue={values.address ?? ""} label={t("profile.presentAddress")} className="min-h-20" />
        <TextAreaField id="pf-permanent" name="permanentAddress" defaultValue={values.permanentAddress ?? ""} label={t("profile.permanentAddress")} className="min-h-20" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-em-name" name="emergencyName" defaultValue={values.emergencyName ?? ""} label={`${t("pilgrims.emergency")}: ${t("pilgrims.emergencyName")}`} />
          <Field id="pf-em-phone" name="emergencyPhone" inputMode="tel" defaultValue={localPhone(values.emergencyPhone)} label={`${t("pilgrims.emergency")}: ${t("pilgrims.emergencyPhone")}`} />
        </div>
        <TextAreaField id="pf-notes" name="notes" defaultValue={values.notes ?? ""} label={t("pilgrims.notes")} className="min-h-20" />
      </div>

      <FormError error={update.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>
          <CheckIcon size={18} />
          {t("profile.save")}
        </Button>
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
