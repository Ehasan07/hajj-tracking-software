"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

export function AdminRevoke({ id }: { id: string }) {
  const t = useTranslations("devices");
  const trpc = useTRPC();
  const router = useRouter();
  const revoke = useMutation(trpc.account.adminRevokeDevice.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <button type="button" disabled={revoke.isPending} onClick={() => revoke.mutate({ id })} className="h-9 rounded-md px-3 text-[13px] font-semibold text-due hover:bg-due-tint">
      {t("remove")}
    </button>
  );
}
