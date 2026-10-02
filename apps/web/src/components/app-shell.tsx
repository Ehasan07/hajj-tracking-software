"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import type { BusinessUnit } from "@hajj/core";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
  BookIcon,
  HotelIcon,
  InquiryIcon,
  LogoutIcon,
  PayrollIcon,
  PilgrimIcon,
  StatementIcon,
  KaabaIcon,
} from "./icons";
import { Khatam } from "./ui";

const UNIT_DOT: Partial<Record<BusinessUnit, string>> = {
  medicine: "bg-unit-medicine",
  zamzam: "bg-unit-zamzam",
  coffee: "bg-unit-coffee",
  supernova: "bg-unit-supernova",
};

interface ShellProps {
  agency: string;
  licence: string | null;
  enabledUnits: BusinessUnit[];
  openInquiries: number;
  children: ReactNode;
}

export function AppShell({ agency, licence, enabledUnits, openInquiries, children }: ShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/app", label: t("nav.today"), icon: StatementIcon, tint: "var(--color-haram-tint)" },
    { href: "/app/pilgrims", label: t("nav.pilgrims"), icon: PilgrimIcon, tint: "var(--color-haram-tint)" },
    {
      href: "/app/inquiries",
      label: t("nav.inquiries"),
      icon: InquiryIcon,
      tint: "var(--color-saffron-tint)",
      badge: openInquiries > 0 ? openInquiries : undefined,
    },
    { href: "/app/packages", label: t("nav.packages"), icon: KaabaIcon, tint: "var(--color-haram-tint)" },
    { href: "/app/guide", label: t("nav.guide"), icon: BookIcon, tint: "var(--color-unit-supernova-tint)" },
  ];
  const later = [
    { label: t("nav.hotels"), icon: HotelIcon, tint: "var(--color-unit-hotel-tint)" },
    { label: t("nav.payroll"), icon: PayrollIcon, tint: "var(--color-unit-office-tint)" },
  ];
  const units = enabledUnits.filter((u) => UNIT_DOT[u]);

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const sidebar = (
    <nav aria-label={t("nav.menu")} className="flex h-full flex-col gap-6 px-4 py-6">
      <Link href="/app" className="flex items-center gap-3 px-2" onClick={() => setOpen(false)}>
        <span className="flex h-12 w-11 items-center justify-center rounded-[22px_22px_8px_8px] bg-haram">
          <Khatam className="h-7 w-7 text-saffron" strokeWidth={7} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] leading-tight font-bold">{agency}</span>
          {licence ? <span className="truncate text-xs text-ink-3">{licence}</span> : null}
        </span>
      </Link>

      <div className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon, tint, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 items-center gap-3 rounded-md px-3 text-[15px] transition-colors ${
                active ? "bg-haram-tint font-bold text-haram-deep" : "hover:bg-ground"
              }`}
            >
              <Icon size={22} tint={active ? "var(--color-paper)" : tint} />
              {label}
              {badge ? (
                <span className="ml-auto rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-bold text-saffron-ink">
                  {locale === "bn" ? badge.toLocaleString("bn-BD") : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {later.map(({ label, icon: Icon, tint }) => (
          <span key={label} className="flex h-12 items-center gap-3 rounded-md px-3 text-[15px] text-ink-3">
            <Icon size={22} tint={tint} />
            {label}
            <span className="ml-auto text-[11px] font-semibold">{t("common.comingSoon")}</span>
          </span>
        ))}
      </div>

      {units.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-xs font-semibold text-ink-3">{t("nav.myBusiness")}</p>
          {units.map((unit) => (
            <span key={unit} className="flex h-11 items-center gap-3 rounded-md px-3 text-[15px] text-ink-2">
              <span className={`h-2.5 w-2.5 rounded-full ${UNIT_DOT[unit]}`} />
              {t(`units.${unit}`)}
              <span className="ml-auto text-[11px] font-semibold text-ink-3">{t("common.comingSoon")}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex gap-1 rounded-md bg-ground p-1">
          {(["bn", "en"] as const).map((l) => (
            <Link
              key={l}
              href={pathname}
              locale={l}
              className={`flex h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold ${
                locale === l ? "bg-paper shadow-[0_1px_3px_rgb(18_48_46/0.18)]" : "text-ink-2"
              }`}
            >
              {l === "bn" ? "বাংলা" : "English"}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-[15px] text-ink-2 hover:bg-ground"
        >
          <LogoutIcon size={20} />
          {t("nav.signOut")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-line bg-paper lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <Link href="/app" className="flex items-center gap-2 font-bold">
          <span className="flex h-9 w-8 items-center justify-center rounded-[16px_16px_6px_6px] bg-haram">
            <Khatam className="h-5 w-5 text-saffron" strokeWidth={8} />
          </span>
          <span className="max-w-[60vw] truncate">{agency}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("nav.menu")}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-ground"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-xs animate-[rise_0.3s_ease-out_both] overflow-y-auto bg-paper">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
