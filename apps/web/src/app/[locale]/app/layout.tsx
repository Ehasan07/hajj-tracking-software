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
  if (!session.session.activeOrganizationId) return redirect({ href: "/onboarding", locale });

  const caller = await api();
  const settings = await caller.tenant.settings();
  if (!settings) return redirect({ href: "/onboarding", locale });
  const counts = await caller.inquiries.counts();

  return (
    <AppShell
      agency={settings.legalName}
      licence={settings.licenseNumber}
      enabledUnits={settings.enabledUnits}
      openInquiries={(counts.new ?? 0) + (counts.follow_up ?? 0)}
    >
      {children}
    </AppShell>
  );
}
