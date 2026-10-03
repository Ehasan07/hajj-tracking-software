import { getTranslations, setRequestLocale } from "next-intl/server";
import { periodKey } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { PrintDoc } from "@/components/print-doc";
import { Reveal } from "@/components/reveal";
import { Badge, buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { AssignForm, BookingForm, PayHotelForm, UnassignButton } from "../hotel-forms";

const STATUS_TONE = { tentative: "pending", confirmed: "paid", cancelled: "neutral" } as const;

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [me, settings] = await Promise.all([caller.tenant.me(), caller.tenant.settings()]);
  if (me.role === "alim") return <NoAccess />;
  const [b, hotels] = await Promise.all([caller.hotels.booking({ id }), caller.hotels.hotels()]);
  const today = periodKey(new Date(), "day", settings?.timeZone);
  const { booking, hotel } = b;
  const due = booking.total - b.paid;
  const canPay = BOOK_ROLES.includes(me.role);

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/app/hotels" className={buttonClass("outline")}>
          ← {t("hotels.title")}
        </Link>
        <PrintButton />
      </div>

      <section className="relative flex animate-rise flex-wrap items-end justify-between gap-5 overflow-hidden rounded-[60px_60px_22px_22px] bg-unit-hotel px-7 pt-10 pb-6 text-white print:hidden">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] opacity-85">{booking.ref}</span>
          <h1 className="text-3xl font-bold">{hotel.name}</h1>
          <span className="text-[15px] opacity-90">
            {t(`hotels.cities.${hotel.city}`)}
            {hotel.distance ? ` · ${hotel.distance}` : ""}
          </span>
          <span className="text-[15px]">
            {dateText(booking.checkIn, locale)} → {dateText(booking.checkOut, locale)} ·{" "}
            {t("hotels.nightsN", { n: digits(b.nights, locale) })}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[booking.status]}>{t(`hotels.statuses.${booking.status}`)}</Badge>
          <span className="tabular text-3xl font-bold">
            {money(booking.total, locale, booking.currency)}
          </span>
          <span className="text-[13px] opacity-90">
            {t("hotels.paid")} {money(b.paid, locale, booking.currency)} · {t("hotels.due")}{" "}
            {money(Math.max(due, 0), locale, booking.currency)}
          </span>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 text-[15px] print:hidden">
        <span className="rounded-md bg-paper px-4 py-2.5">
          {digits(booking.rooms, locale)} × {t(`hotels.roomTypes.${booking.roomType}`)}
        </span>
        <span className="rounded-md bg-paper px-4 py-2.5">
          {t("hotels.filled")}: <b>{digits(b.assigned.length, locale)}</b> /{" "}
          {digits(b.beds, locale)}
        </span>
        <span className="rounded-md bg-paper px-4 py-2.5">
          {t("hotels.rate")}: {money(booking.rate, locale, booking.currency)}
        </span>
        {booking.supplier ? (
          <span className="rounded-md bg-paper px-4 py-2.5">{booking.supplier}</span>
        ) : null}
      </div>

      <div className="print:hidden">
        <Reveal label={t("hotels.editBooking")} variant="outline" plus={false}>
          <BookingForm
            hotels={hotels.filter((h) => h.active || h.id === hotel.id)}
            initial={booking}
          />
        </Reveal>
      </div>

      <div className="flex flex-col gap-3 print:hidden">
        <h2 className="text-xl font-bold">{t("hotels.roomList")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {b.rooms.map((r) => {
            const full = r.people.length >= r.capacity;
            return (
              <li key={r.roomNo}>
                <Card
                  className={`flex h-full flex-col gap-3 border-t-4 p-5 ${full ? "border-paid" : "border-line-strong"}`}
                >
                  <div className="flex items-center justify-between">
                    <b className="text-[17px]">
                      {t("hotels.room", { n: digits(r.roomNo, locale) })}
                    </b>
                    <span
                      className="flex gap-1"
                      aria-label={`${digits(r.people.length, locale)} / ${digits(r.capacity, locale)}`}
                    >
                      {Array.from({ length: r.capacity }, (_, i) => (
                        <span
                          key={i}
                          className={`h-3 w-3 rounded-full ${i < r.people.length ? "bg-paid" : "bg-line-strong"}`}
                        />
                      ))}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {r.people.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2 rounded-md bg-ground px-3 py-2 text-[14px]"
                      >
                        <Link
                          href={`/app/pilgrims/${p.pilgrimId}`}
                          className="flex min-w-0 flex-1 flex-col hover:text-haram"
                        >
                          <b className="truncate font-semibold">{p.fullName}</b>
                          <span className="font-mono text-[11px] text-ink-3">
                            {p.ref}
                            {p.gender ? ` · ${t(`pilgrims.${p.gender}`)}` : ""}
                          </span>
                        </Link>
                        <UnassignButton id={p.id} />
                      </li>
                    ))}
                  </ul>
                  {!full && booking.status !== "cancelled" ? (
                    <AssignForm
                      bookingId={booking.id}
                      roomNo={r.roomNo}
                      candidates={b.candidates}
                    />
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ol>
      </div>

      {canPay ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] print:hidden">
          <Card className="overflow-hidden">
            <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("hotels.payments")}</h2>
            {b.payments.length === 0 ? (
              <p className="px-6 pb-6 text-ink-3">{t("hotels.noPayments")}</p>
            ) : (
              <ul>
                {b.payments.map((p) => (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center gap-3 border-t border-[#eef3f2] px-6 py-3 text-[15px] ${p.voidedAt ? "text-ink-3 line-through" : ""}`}
                  >
                    <span className="text-[13px] text-ink-3">
                      {dateText(p.businessDate, locale)}
                    </span>
                    <span>
                      {t(`methods.${p.method}`)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <b className="tabular ml-auto">{money(p.amount, locale, p.currency)}</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("hotels.pay")}</h2>
            <PayHotelForm
              bookingId={booking.id}
              currency={booking.currency}
              due={Math.max(due, 0)}
              today={today}
            />
          </Card>
        </div>
      ) : null}

      {/* Rooming list for the hotel's front desk. */}
      <PrintDoc className="hidden print:block">
        <h1 className="text-lg font-bold">
          {settings?.legalName} — {t("hotels.roomingList")}
        </h1>
        <p className="text-[12px]">
          {hotel.name} · {booking.ref} · {dateText(booking.checkIn, locale)} →{" "}
          {dateText(booking.checkOut, locale)}
        </p>
        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-left">
              {[t("hotels.roomCol"), t("pilgrims.name"), "ID", t("pilgrims.gender")].map((h) => (
                <th key={h} className="border border-ink px-2 py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.assigned.map((p) => (
              <tr key={p.id}>
                <td className="border border-ink px-2 py-1">{digits(p.roomNo, locale)}</td>
                <td className="border border-ink px-2 py-1 font-semibold">{p.fullName}</td>
                <td className="border border-ink px-2 py-1 font-mono">{p.ref}</td>
                <td className="border border-ink px-2 py-1">
                  {p.gender ? t(`pilgrims.${p.gender}`) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintDoc>
    </PageBody>
  );
}
