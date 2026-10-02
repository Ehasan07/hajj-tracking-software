import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckIcon } from "@/components/icons";
import { Khatam } from "@/components/ui";
import { dateText, money, type Locale } from "@/lib/format";
import { verifyReceipt } from "@/server/verify";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VerifyPage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("verify");
  const receipt = await verifyReceipt(token);
  const state = !receipt ? "invalid" : receipt.voided ? "voided" : "valid";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md animate-rise overflow-hidden rounded-[180px_180px_24px_24px] bg-paper px-8 pt-20 pb-8 text-center shadow-[0_30px_60px_-36px_rgb(18_48_46/0.5)]">
        <Khatam className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 animate-turn text-[#eef3f2]" strokeWidth={1} />
        <span
          className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            state === "valid" ? "bg-paid text-white" : "bg-due-tint text-due"
          }`}
        >
          {state === "valid" ? <CheckIcon size={40} /> : <span className="text-4xl font-bold">!</span>}
        </span>
        <h1 className="relative mt-5 text-sm font-semibold tracking-wide text-ink-3">{t("title")}</h1>
        <p className={`relative mt-1 text-2xl font-bold ${state === "valid" ? "text-paid" : "text-due"}`}>{t(state)}</p>
        {receipt ? (
          <dl className="relative mt-6 grid grid-cols-2 gap-4 border-t border-dashed border-line pt-6 text-left">
            <div className="col-span-2">
              <dt className="text-[13px] text-ink-3">{t("issuedBy")}</dt>
              <dd className="font-semibold">{receipt.agency}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">{t("amount")}</dt>
              <dd className="tabular text-xl font-bold">{money(receipt.amount, locale, receipt.currency)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">{t("date")}</dt>
              <dd className="font-semibold">{dateText(receipt.received_at, locale)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">MR</dt>
              <dd className="font-mono text-sm">{receipt.receipt_no}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">{t("pilgrim")}</dt>
              <dd className="text-sm">
                {receipt.pilgrim_name} <span className="font-mono">{receipt.pilgrim_ref}</span>
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </main>
  );
}
