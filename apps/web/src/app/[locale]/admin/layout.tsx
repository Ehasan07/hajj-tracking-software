import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/session";
import { api } from "@/trpc/server";

export const metadata: Metadata = { title: "Platform admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  // Anyone who is not a platform admin gets a plain 404: the console's existence is not advertised.
  const { isAdmin } = await (await api()).platform.me();
  if (!isAdmin) notFound();
  return <AdminShell email={session.user.email}>{children}</AdminShell>;
}
