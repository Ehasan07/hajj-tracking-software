import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/session";
import { api } from "@/trpc/server";
import { smsConfigured, verifiedPhone } from "@/server/phone-otp";
import { OnboardingForm } from "./onboarding-form";
import { PhoneStep } from "./phone-step";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  // An agency that is already set up goes straight to its dashboard; one whose
  // setup was interrupted continues with the same organization.
  const existingOrgId = session.session.activeOrganizationId ?? undefined;
  if (existingOrgId) {
    const settings = await (await api()).tenant.settings().catch(() => null);
    if (settings) return redirect({ href: "/app", locale });
  }
  // With SMS working, the owner proves a mobile number first (it is how a forgotten password comes back).
  if (smsConfigured() && !(await verifiedPhone(session.user.id))) {
    const tp = await getTranslations("phone");
    return (
      <AuthShell title={tp("title")}>
        <PhoneStep why={tp("why")} />
      </AuthShell>
    );
  }
  const t = await getTranslations("onboarding");
  return (
    <AuthShell title={t("title")}>
      <OnboardingForm existingOrgId={existingOrgId} />
    </AuthShell>
  );
}
