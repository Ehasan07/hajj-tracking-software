"use client";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { buttonClass } from "./ui";

/** Signs out and opens the sign-in page, for someone who is logged in with the wrong account. */
export function SwitchAccount({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={buttonClass("primary", "h-12")}
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
