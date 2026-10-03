import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/session";
import { api } from "@/trpc/server";

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  const caller = await api();
  if (!session.session.activeOrganizationId) {
    const { isAdmin } = await caller.platform.me();
    return redirect({ href: isAdmin ? "/admin" : "/onboarding", locale });
  }

  const settings = await caller.tenant.settings();
  if (!settings) return redirect({ href: "/onboarding", locale });
  const me = await caller.tenant.me();
  const [counts, subscription] = await Promise.all([
    me.role === "shop_operator" ? Promise.resolve(null) : caller.inquiries.counts(),
    caller.tenant.subscription(),
  ]);

  return (
    <AppShell
      agency={settings.legalName}
      licence={settings.licenseNumber}
      role={me.role}
      shops={me.shops}
      openInquiries={counts ? (counts.new ?? 0) + (counts.follow_up ?? 0) : 0}
      subscription={
        subscription
          ? {
              status: subscription.status,
              inactive: subscription.inactive,
              trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
              planNameBn: subscription.planNameBn,
              planNameEn: subscription.planNameEn,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
