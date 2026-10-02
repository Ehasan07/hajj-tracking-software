import type { Metadata } from "next";
import { Amiri, Amiri_Quran, Anek_Bangla, Galada, IBM_Plex_Mono, Reem_Kufi, Tiro_Bangla } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { TRPCReactProvider } from "@/trpc/react";
import "../globals.css";

const anek = Anek_Bangla({ subsets: ["bengali", "latin"], variable: "--font-anek", display: "swap" });
const tiro = Tiro_Bangla({ subsets: ["bengali", "latin"], weight: "400", variable: "--font-tiro", display: "swap" });
const galada = Galada({ subsets: ["bengali", "latin"], weight: "400", variable: "--font-galada", display: "swap" });
// Arabic: Amiri Quran for Quranic text, Amiri for hadith and duas, Reem Kufi for ornament only.
const amiriQuran = Amiri_Quran({ subsets: ["arabic"], weight: "400", variable: "--font-amiri-quran", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-reem-kufi", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { default: t("title"), template: `%s · ${t("title")}` }, description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${anek.variable} ${tiro.variable} ${galada.variable} ${plexMono.variable} ${amiriQuran.variable} ${amiri.variable} ${reemKufi.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
