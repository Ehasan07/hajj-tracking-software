"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { useRouter } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

export function RevokeDevice({ id, current }: { id: string; current: boolean }) {
  const t = useTranslations("devices");
  const trpc = useTRPC();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const revoke = useMutation(trpc.account.revokeDevice.mutationOptions({ onSuccess: () => router.refresh() }));
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="h-10 rounded-md px-3 text-[14px] font-semibold text-due hover:bg-due-tint">
        {t("remove")}
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="max-w-60 text-right text-[12px] text-ink-3">{current ? t("removeThisHint") : t("removeHint")}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirm(false)} className="h-9 rounded-md px-3 text-[13px] text-ink-2">
          ✕
        </button>
        <button type="button" disabled={revoke.isPending} onClick={() => revoke.mutate({ id })} className="h-9 rounded-md bg-due px-3 text-[13px] font-semibold text-white">
          {t("confirmRemove")}
        </button>
      </div>
      <FormError error={revoke.error} />
    </div>
  );
}

/** End every other session and forget every other trusted device. */
export function SignOutOthers({ sessions }: { sessions: number }) {
  const t = useTranslations("devices");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  if (state === "done") return <span className="text-[14px] font-semibold text-paid">{t("othersDone")}</span>;
  if (state === "confirm" || state === "busy" || state === "error") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-ink-3">{t("othersHint")}</span>
        <button type="button" onClick={() => setState("idle")} className="h-9 rounded-md px-3 text-[13px] text-ink-2">
          ✕
        </button>
        <button
          type="button"
          disabled={state === "busy"}
          onClick={async () => {
            setState("busy");
            const res = await fetch("/api/device/revoke-others", { method: "POST" });
            setState(res.ok ? "done" : "error");
            router.refresh();
          }}
          className="h-9 rounded-md bg-due px-3 text-[13px] font-semibold text-white"
        >
          {t("othersConfirm")}
        </button>
        {state === "error" ? <span className="text-[13px] font-semibold text-due">{t("othersFailed")}</span> : null}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setState("confirm")} className="h-10 rounded-md border-[1.5px] border-due px-4 text-[14px] font-semibold text-due hover:bg-due-tint">
      {t("others", { n: digits(Math.max(sessions - 1, 0), locale) })}
    </button>
  );
}
