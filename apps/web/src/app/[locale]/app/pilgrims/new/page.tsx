import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { buttonClass, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { PilgrimForm } from "./pilgrim-form";

export default async function NewPilgrimPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ inquiry?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { inquiry: inquiryId } = await searchParams;
  const t = await getTranslations();
  const caller = await api();
  const packages = await caller.packages.list({ activeOnly: true });
  const inquiry = inquiryId && /^[0-9a-f-]{36}$/.test(inquiryId) ? await caller.inquiries.get({ id: inquiryId }).catch(() => null) : null;

  return (
    <PageBody>
      <PageHeader
        title={t("pilgrims.new")}
        subtitle={inquiry ? t("pilgrims.fromInquiry", { ref: inquiry.ref }) : undefined}
      />
      {packages.length === 0 ? (
        <Card>
          <EmptyState
            title={t("packages.empty")}
            body={t("packages.emptyBody")}
            action={
              <Link href="/app/packages" className={buttonClass("primary")}>
                {t("packages.new")}
              </Link>
            }
          />
        </Card>
      ) : (
        <PilgrimForm
          packages={packages.map((p) => ({ id: p.id, label: `${p.name} · ${money(p.price, locale, p.currency)}` }))}
          prefill={{
            inquiryId: inquiry?.id,
            inquiryRef: inquiry?.ref,
            name: inquiry?.name,
            phone: inquiry ? `0${inquiry.phone.slice(4)}` : undefined,
            packageId: inquiry?.packageId ?? undefined,
          }}
        />
      )}
    </PageBody>
  );
}
