"use client";

import { useTranslations } from "next-intl";
import type { ShopUnit } from "@hajj/core";
import { Link, usePathname } from "@/i18n/navigation";

export function ShopTabs({ unit, color }: { unit: ShopUnit; color: string }) {
  const t = useTranslations("shop.tabs");
  const pathname = usePathname();
  const base = `/app/shop/${unit}`;
  const tabs = [
    { href: base, label: t("pos") },
    ...(unit === "zamzam" ? [{ href: `${base}/routes`, label: t("routes") }] : []),
    { href: `${base}/products`, label: t("products") },
    { href: `${base}/customers`, label: unit === "zamzam" ? t("shops") : t("customers") },
    { href: `${base}/sales`, label: t("sales") },
    { href: `${base}/daily`, label: t("daily") },
  ];
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 rounded-md bg-paper p-1">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold whitespace-nowrap transition-colors ${
                  active ? "text-white" : "text-ink-2 hover:bg-ground"
                }`}
                style={active ? { background: color } : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
