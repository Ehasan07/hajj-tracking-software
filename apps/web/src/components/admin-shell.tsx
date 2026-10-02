"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { KaabaIcon, LogoutIcon, PilgrimIcon, StatementIcon } from "./icons";
import { Khatam } from "./ui";

/** The platform owner's console. Deliberately dark, so it is never mistaken for an agency's app. */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const nav = [
    { href: "/admin", label: t("nav.overview"), icon: StatementIcon },
    { href: "/admin/agencies", label: t("nav.agencies"), icon: PilgrimIcon },
    { href: "/admin/plans", label: t("nav.plans"), icon: KaabaIcon },
  ];
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6 bg-ink px-4 py-6 text-ground lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-12 w-11 items-center justify-center rounded-[22px_22px_8px_8px] bg-saffron">
            <Khatam className="h-7 w-7 text-ink" strokeWidth={8} />
          </span>
          <span className="flex flex-col">
            <b className="text-[17px] leading-tight">{t("title")}</b>
            <span className="w-fit rounded-full bg-[#1c4744] px-2 py-0.5 text-[11px] font-bold tracking-wide text-saffron">{t("badge")}</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label={t("title")}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex h-12 shrink-0 items-center gap-3 rounded-md px-3 text-[15px] ${
                active(href) ? "bg-[#1c4744] font-bold text-saffron" : "text-[#c7ddd9] hover:bg-[#16302e]"
              }`}
            >
              <Icon size={22} tint="transparent" accent="var(--color-saffron)" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 lg:flex">
          <div className="flex gap-1 rounded-md bg-[#16302e] p-1">
            {(["bn", "en"] as const).map((l) => (
              <Link
                key={l}
                href={pathname}
                locale={l}
                className={`flex h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold ${locale === l ? "bg-ground text-ink" : "text-[#c7ddd9]"}`}
              >
                {l === "bn" ? "বাংলা" : "English"}
              </Link>
            ))}
          </div>
          <span className="truncate px-2 text-[13px] text-[#9fb8b4]">{email}</span>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/sign-in");
              router.refresh();
            }}
            className="flex h-11 items-center gap-3 rounded-md px-3 text-[15px] text-[#c7ddd9] hover:bg-[#16302e]"
          >
            <LogoutIcon size={20} />
            {locale === "bn" ? "লগআউট" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="min-w-0 bg-ground">{children}</div>
    </div>
  );
}
