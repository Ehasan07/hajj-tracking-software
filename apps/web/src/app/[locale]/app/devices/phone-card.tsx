"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PhoneIcon } from "@/components/icons";
import { PhoneVerify } from "@/components/phone-verify";
import { Button, Card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/** The account's mobile number: used for password reset by SMS. Change it by proving the new one. */
export function PhoneCard({ masked }: { masked: string | null }) {
  const t = useTranslations("phone.card");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  return (
    <Card className="flex flex-wrap items-start gap-4 p-6">
      <span className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[26px_26px_10px_10px] bg-unit-zamzam-tint">
        <PhoneIcon size={26} className="text-unit-zamzam" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <b className="text-[17px]">{masked ? t("verified", { phone: masked }) : t("missing")}</b>
          <p className="text-[14px] leading-relaxed text-ink-2">{t("why")}</p>
        </div>
        {editing ? (
          <div className="max-w-sm">
            <PhoneVerify onDone={() => (setEditing(false), router.refresh())} />
          </div>
        ) : (
          <Button type="button" variant={masked ? "outline" : "primary"} className="self-start" onClick={() => setEditing(true)}>
            {masked ? t("change") : t("add")}
          </Button>
        )}
      </div>
    </Card>
  );
}
