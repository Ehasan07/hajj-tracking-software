"use client";

import { PhoneVerify } from "@/components/phone-verify";
import { useRouter } from "@/i18n/navigation";

/** Shown before agency setup when the owner hasn't proved a mobile number yet. */
export function PhoneStep({ why }: { why: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-2">{why}</p>
      <PhoneVerify onDone={() => router.refresh()} />
    </div>
  );
}
