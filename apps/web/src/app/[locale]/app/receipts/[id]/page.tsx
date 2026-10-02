import { getTranslations, setRequestLocale } from "next-intl/server";
import QRCode from "qrcode";
import { amountInWords } from "@hajj/core";
import { BASMALAH_GLYPH, receiptItem } from "@hajj/sacred";
import { Verses } from "@/components/sacred";
import { presented, type Review } from "@/lib/sacred";
import { PageBody } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, phoneText, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";

export default async function ReceiptPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [{ payment, pilgrim, packageName, agency, totals }, reviews] = await Promise.all([
    caller.payments.receipt({ id }),
    caller.sacred.reviews(),
  ]);
  const blessing = receiptItem();
  const blessingShown = presented(blessing, reviews[`item:${blessing.id}`] as Review | undefined, locale);

  const origin = process.env.BETTER_AUTH_URL ?? "";
  const verifyUrl = `${origin}/verify/${payment.verifyToken}`;
  const qr = await QRCode.toString(verifyUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#12302e", light: "#0000" },
  });
  const voided = Boolean(payment.voidedAt);
  const purpose = payment.purpose || (packageName ? t("receipt.defaultPurpose", { package: packageName }) : "—");

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/pilgrims/${pilgrim.id}`} className={buttonClass("outline")}>
          ← {pilgrim.fullName}
        </Link>
        <PrintButton />
      </div>

      <article className="print-area relative mx-auto grid w-full max-w-[860px] animate-rise grid-cols-[36px_minmax(0,1fr)] sm:aspect-[210/148] sm:grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-lg bg-paper text-ink shadow-[0_30px_60px_-36px_rgb(18_48_46/0.5)]">
        <div className="flex flex-col items-center justify-between bg-haram py-6">
          <Khatam className="h-6 w-6 text-saffron sm:h-8 sm:w-8" strokeWidth={7} />
          <span className="rotate-180 font-mono text-xs tracking-[0.2em] text-haram-tint [writing-mode:vertical-rl]">{payment.receiptNo}</span>
          <span className="h-2.5 w-2.5 rounded-full bg-saffron" />
        </div>

        <div className="relative flex min-w-0 flex-col gap-4 px-4 py-5 sm:gap-[2.2%] sm:px-[4.5%] sm:py-[3.5%]">
          <Khatam className="absolute -right-24 -bottom-28 h-80 w-80 text-[#eef3f2]" strokeWidth={1.2} />

          <p lang="ar" dir="rtl" aria-label="Bismillah" className="relative -mb-2 text-center font-quran text-[26px] leading-none text-haram-deep sm:-mt-1">
            {BASMALAH_GLYPH}
          </p>

          <header className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-xl font-bold">{agency.legalName}</span>
              <span className="text-xs text-ink-3">
                {[agency.licenseNumber ? `${t("receipt.licence")} ${agency.licenseNumber}` : null, agency.address, agency.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <div className="flex shrink-0 flex-col sm:items-end">
              <span className="font-display text-2xl text-haram">{t("receipt.title")}</span>
              <span className="text-[11px] tracking-[0.12em] text-ink-3">MONEY RECEIPT</span>
            </div>
          </header>

          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              [t("receipt.no"), payment.receiptNo, true],
              [t("receipt.date"), dateText(payment.receivedAt, locale, true), false],
              [t("receipt.pilgrimId"), pilgrim.ref, true],
            ].map(([label, value, mono]) => (
              <div key={String(label)} className="flex flex-col gap-0.5 rounded-xl bg-ground px-3 py-2">
                <span className="text-[11px] text-ink-3">{label}</span>
                <span className={mono ? "font-mono text-sm font-medium" : "text-sm font-semibold"}>{value}</span>
              </div>
            ))}
          </div>

          <dl className="relative grid grid-cols-[92px_minmax(0,1fr)] gap-y-2 text-[15px] sm:grid-cols-[130px_minmax(0,1fr)]">
            <dt className="text-ink-3">{t("receipt.from")}</dt>
            <dd className="border-b border-dotted border-line-strong pb-0.5 font-semibold">
              {pilgrim.fullName} · {phoneText(pilgrim.phone, locale)}
            </dd>
            <dt className="text-ink-3">{t("receipt.for")}</dt>
            <dd className="border-b border-dotted border-line-strong pb-0.5">{purpose}</dd>
            <dt className="text-ink-3">{t("receipt.inWords")}</dt>
            <dd className="border-b border-dotted border-line-strong pb-0.5">
              {amountInWords(payment.amount, payment.currency, "bn")} · {amountInWords(payment.amount, payment.currency, "en")}
            </dd>
            <dt className="text-ink-3">{t("receipt.method")}</dt>
            <dd className="border-b border-dotted border-line-strong pb-0.5">
              {t(`methods.${payment.method}`)}
              {payment.reference ? ` · ${payment.reference}` : ""}
            </dd>
          </dl>

          <div className="relative flex max-w-[64%] flex-col gap-0.5 self-start max-sm:max-w-full">
            <Verses item={blessing} className="text-[17px] leading-[2] text-haram-deep" />
            <span className="text-[10px] text-ink-3">
              {blessingShown.approved ? `${blessingShown.meanings[0]} · ` : ""}
              {blessing.citation[locale]}
            </span>
          </div>

          <div
            className={`relative mr-4 flex animate-stamp self-end sm:absolute sm:top-[56%] sm:right-[5%] sm:mr-0 flex-col items-center rounded-xl border-[3px] border-double px-5 py-2 [animation-delay:400ms] ${
              voided ? "border-due text-due" : "border-paid text-paid"
            }`}
          >
            <span className="text-2xl font-extrabold tracking-[0.08em]">{voided ? t("receipt.stampVoid") : t("receipt.stampReceived")}</span>
            <span className="font-mono text-[10px] tracking-widest">
              {digits(payment.businessDate.split("-").reverse().join("."), locale)}
            </span>
          </div>

          <footer className="relative mt-auto flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-wrap items-stretch gap-4">
              <div className="flex flex-col justify-center rounded-2xl bg-haram-night px-5 py-2.5 text-white">
                <span className="text-xs text-[#a9cfc9]">{t("receipt.received")}</span>
                <span className="tabular text-3xl leading-tight font-bold">{money(payment.amount, locale, payment.currency, false)}</span>
              </div>
              <div className="flex flex-col justify-center gap-0.5 text-[13px]">
                <span>
                  {t("receipt.packagePrice")} <b className="tabular">{money(pilgrim.packagePrice, locale, payment.currency)}</b>
                </span>
                {pilgrim.discount > 0 ? (
                  <span>
                    {t("receipt.discount")} <b className="tabular">{money(pilgrim.discount, locale, payment.currency)}</b>
                  </span>
                ) : null}
                <span>
                  {t("receipt.totalPaid")} <b className="tabular text-paid">{money(totals.paid, locale, payment.currency)}</b>
                </span>
                <span className="text-due">
                  {t("receipt.due")} <b className="tabular">{money(totals.due, locale, payment.currency)}</b>
                </span>
              </div>
            </div>
            <div className="flex items-end gap-5">
              <div className="flex flex-col items-center gap-1">
                <div className="h-[78px] w-[78px] rounded-xl border-[1.5px] border-line-strong p-1.5 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
                <span className="text-[10px] text-ink-3">{t("receipt.verify")}</span>
              </div>
              <div className="flex w-36 flex-col items-center gap-1">
                <span className="w-full border-t border-ink" />
                <span className="text-xs text-ink-3">{t("receipt.signature")}</span>
              </div>
            </div>
          </footer>

        </div>
      </article>
    </PageBody>
  );
}
