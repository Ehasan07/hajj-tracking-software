import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { periodKey } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { Badge, buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { keyLabel } from "@/lib/period";
import { BOOK_ROLES, MANAGER_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { GenerateSheetForm, LineEditor, SheetActions } from "../payroll-forms";

const TONE = { draft: "pending", locked: "info", paid: "paid" } as const;

export default async function SheetPage({
  params,
}: {
  params: Promise<{ locale: Locale; month: string }>;
}) {
  const { locale, month } = await params;
  setRequestLocale(locale);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) notFound();
  const t = await getTranslations("payroll");
  const caller = await api();
  const [me, settings] = await Promise.all([caller.tenant.me(), caller.tenant.settings()]);
  if (!BOOK_ROLES.includes(me.role)) return <NoAccess />;
  const data = await caller.payroll.sheet({ month });
  const today = periodKey(new Date(), "day", settings?.timeZone);

  if (!data) {
    return (
      <PageBody>
        <Link href="/app/payroll" className={buttonClass("outline", "self-start")}>
          ← {t("title")}
        </Link>
        <Card className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-bold">{keyLabel(month, locale)}</h1>
          <p className="text-ink-3">{t("noSheetYet")}</p>
          <GenerateSheetForm month={month} workingDays={26} label={t("generate")} />
        </Card>
      </PageBody>
    );
  }

  const { sheet, lines, totals } = data;
  const draft = sheet.status === "draft";

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/app/payroll" className={buttonClass("outline")}>
          ← {t("title")}
        </Link>
        <PrintButton />
      </div>

      <Card className="flex flex-col gap-4 p-6 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t("sheetFor")} {keyLabel(month, locale)}
          </h1>
          <Badge tone={TONE[sheet.status]}>{t(`status.${sheet.status}`)}</Badge>
          <span className="text-[14px] text-ink-3">
            {t("workingDaysN", { n: digits(sheet.workingDays, locale) })}
          </span>
        </div>
        <p className="text-[14px] text-ink-3">{t(`statusHint.${sheet.status}`)}</p>
        {draft ? (
          <GenerateSheetForm month={month} workingDays={sheet.workingDays} label={t("refresh")} />
        ) : null}
        {sheet.status !== "paid" ? (
          <SheetActions
            id={sheet.id}
            status={sheet.status}
            isAdmin={MANAGER_ROLES.includes(me.role)}
            today={today}
          />
        ) : null}
        {sheet.paidAt ? (
          <p className="font-semibold text-paid">
            {t("paidOn")} {dateText(sheet.paidAt, locale, true)}
          </p>
        ) : null}
      </Card>

      <PrintDoc size="a4landscape" className="flex flex-col gap-4">
        <header className="hidden flex-col gap-0.5 print:flex">
          <b className="text-lg">{settings?.legalName}</b>
          <span className="text-[13px]">
            {t("sheetFor")} {keyLabel(month, locale)} ·{" "}
            {t("workingDaysN", { n: digits(sheet.workingDays, locale) })} ·{" "}
            {t(`status.${sheet.status}`)}
          </span>
        </header>
        <Card className="overflow-hidden print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-[14px] print:min-w-0 print:text-[10.5px]">
              <thead className="bg-field text-left text-[12px] text-ink-3 print:text-ink">
                <tr>
                  <th className="px-4 py-3 font-normal">#</th>
                  <th className="px-3 py-3 font-normal">{t("name")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("basic")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("allowances")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("overtime")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("gross")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("absence")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("deductions")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("advanceRecovery")}</th>
                  <th className="px-3 py-3 text-right font-normal">{t("net")}</th>
                  <th className="hidden px-3 py-3 font-normal print:table-cell">
                    {t("signature")}
                  </th>
                  {draft ? <th className="px-4 py-3 print:hidden" /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id} className="border-t border-[#eef3f2] align-top print:border-ink">
                    <td className="px-4 py-3 text-ink-3">{digits(i + 1, locale)}</td>
                    <td className="px-3 py-3">
                      <b className="font-semibold">{l.name}</b>
                      <span className="block text-[12px] text-ink-3">
                        {[l.designation, l.payoutMethod, l.accountNo].filter(Boolean).join(" · ")}
                      </span>
                      {l.unpaidAbsentDays ? (
                        <span className="block text-[12px] text-due">
                          {t("absentN", { n: digits(l.unpaidAbsentDays, locale) })}
                        </span>
                      ) : null}
                      {l.note ? (
                        <span className="block text-[12px] text-ink-2">{l.note}</span>
                      ) : null}
                    </td>
                    <td className="tabular px-3 py-3 text-right">{money(l.basic, locale)}</td>
                    <td className="tabular px-3 py-3 text-right">
                      {money(l.breakdown.allowanceTotal, locale)}
                      {l.allowances.length ? (
                        <span className="block text-[11px] text-ink-3">
                          {l.allowances.map((a) => a.label).join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular px-3 py-3 text-right">
                      {l.breakdown.overtime ? money(l.breakdown.overtime, locale) : "—"}
                    </td>
                    <td className="tabular px-3 py-3 text-right font-semibold">
                      {money(l.gross, locale)}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-due">
                      {l.breakdown.absenceDeduction
                        ? money(l.breakdown.absenceDeduction, locale)
                        : "—"}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-due">
                      {l.breakdown.deductionTotal ? money(l.breakdown.deductionTotal, locale) : "—"}
                      {l.deductions.length ? (
                        <span className="block text-[11px] text-ink-3">
                          {l.deductions.map((a) => a.label).join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-due">
                      {l.advanceRecovery ? money(l.advanceRecovery, locale) : "—"}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-[15px] font-bold print:text-[11px]">
                      {money(l.net, locale)}
                    </td>
                    <td className="hidden w-28 border-b border-ink px-3 py-3 print:table-cell" />
                    {draft ? (
                      <td className="px-4 py-3 text-right print:hidden">
                        <LineEditor
                          line={l}
                          workingDays={sheet.workingDays}
                          advanceDue={data.advanceDue[l.employeeId] ?? 0}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink font-bold">
                  <td className="px-4 py-3" colSpan={2}>
                    {t("total")} · {t("people", { n: digits(lines.length, locale) })}
                  </td>
                  <td className="tabular px-3 py-3 text-right">{money(totals.basic, locale)}</td>
                  <td className="tabular px-3 py-3 text-right">
                    {money(totals.allowances, locale)}
                  </td>
                  <td className="tabular px-3 py-3 text-right">{money(totals.overtime, locale)}</td>
                  <td className="tabular px-3 py-3 text-right">{money(totals.gross, locale)}</td>
                  <td className="tabular px-3 py-3 text-right" colSpan={2}>
                    {money(totals.deductions - totals.advance, locale)}
                  </td>
                  <td className="tabular px-3 py-3 text-right">{money(totals.advance, locale)}</td>
                  <td className="tabular px-3 py-3 text-right text-[16px] print:text-[12px]">
                    {money(totals.net, locale)}
                  </td>
                  <td className="hidden print:table-cell" />
                  {draft ? <td className="print:hidden" /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <div className="hidden justify-between pt-10 text-[12px] print:flex">
          {[t("preparedBy"), t("checkedBy"), t("approvedBy")].map((s) => (
            <span key={s} className="w-48 border-t border-ink pt-1 text-center">
              {s}
            </span>
          ))}
        </div>
      </PrintDoc>
    </PageBody>
  );
}
