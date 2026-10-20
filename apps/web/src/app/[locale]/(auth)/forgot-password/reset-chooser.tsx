"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";
import { PhoneResetForm } from "./phone-reset-form";

/** Email or mobile, whichever the person can reach; only the channels the server can send on are offered. */
export function ResetChooser({ email, sms }: { email: boolean; sms: boolean }) {
  const t = useTranslations("phone.reset");
  const [via, setVia] = useState<"email" | "sms">(email ? "email" : "sms");
  if (!(email && sms)) return via === "sms" ? <PhoneResetForm /> : <ForgotPasswordForm />;
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("via")} className="grid grid-cols-2 gap-1 rounded-lg bg-ground p-1">
        {(["email", "sms"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={via === v}
            onClick={() => setVia(v)}
            className={`rounded-md py-2.5 text-[15px] font-semibold ${via === v ? "bg-paper shadow-sm" : "text-ink-2 hover:text-ink"}`}
          >
            {t(`tabs.${v}`)}
          </button>
        ))}
      </div>
      {via === "email" ? <ForgotPasswordForm /> : <PhoneResetForm />}
    </div>
  );
}
