import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/session";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect({ href: "/sign-in", locale });
  const t = await getTranslations("onboarding");
  return (
    <AuthShell title={t("title")}>
      <OnboardingForm />
    </AuthShell>
  );
}
