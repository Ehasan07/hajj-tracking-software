import { getTranslations, setRequestLocale } from "next-intl/server";
import { periodKey } from "@hajj/core";
import { HotelIcon } from "@/components/icons";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { shortDay } from "@/lib/period";
import { api } from "@/trpc/server";
import { BookingForm, HotelForm } from "./hotel-forms";

const STATUS_TONE = { tentative: "pending", confirmed: "paid", cancelled: "neutral" } as const;

export default async function HotelsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hotels");
  const caller = await api();
  const [me, settings] = await Promise.all([caller.tenant.me(), caller.tenant.settings()]);
  if (me.role === "alim") return <NoAccess />;
  const today = periodKey(new Date(), "day", settings?.timeZone);
  const [hotels, bookings] = await Promise.all([
    caller.hotels.hotels(),
    caller.hotels.bookings({ includeCancelled: true }),
  ]);
  // Show the 30 nights from the first upcoming check-in (or today).
  const nextIn =
    bookings
      .filter((b) => b.status !== "cancelled" && b.checkOut > today)
      .map((b) => (b.checkIn > today ? b.checkIn : today))
      .sort()[0] ?? today;
  const occupancy = await caller.hotels.occupancy({ from: nextIn, days: 30 });
  const maxBeds = Math.max(1, ...occupancy.map((d) => Math.max(d.makkah.beds, d.madinah.beds)));
  const activeHotels = hotels.filter((h) => h.active);

  return (
    <PageBody>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">{t("occupancy")}</h2>
          <span className="flex flex-wrap gap-4 text-[13px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-haram" /> {t("cities.makkah")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-saffron" /> {t("cities.madinah")}
            </span>
            <span className="text-ink-3">{t("occupancyHint")}</span>
          </span>
        </div>
        {occupancy.every((d) => d.makkah.beds + d.madinah.beds === 0) ? (
          <p className="text-ink-3">{t("noBookings")}</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="flex min-w-[720px] items-end gap-1"
              role="img"
              aria-label={t("occupancy")}
            >
              {occupancy.map((d) => (
                <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-1">
                  <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-paper opacity-0 group-hover:opacity-100">
                    {shortDay(d.day, locale)} · {t("cities.makkah")}{" "}
                    {digits(d.makkah.filled, locale)}/{digits(d.makkah.beds, locale)} ·{" "}
                    {t("cities.madinah")} {digits(d.madinah.filled, locale)}/
                    {digits(d.madinah.beds, locale)}
                  </span>
                  <div className="flex h-28 w-full items-end gap-[2px]">
                    {(["makkah", "madinah"] as const).map((c) => (
                      <div
                        key={c}
                        className="relative flex h-full flex-1 items-end rounded-t-[3px] bg-ground"
                      >
                        <span
                          className="absolute inset-x-0 bottom-0 rounded-t-[3px] opacity-35"
                          style={{
                            height: `${(d[c].beds / maxBeds) * 100}%`,
                            background:
                              c === "makkah" ? "var(--color-haram)" : "var(--color-saffron)",
                          }}
                        />
                        <span
                          className="absolute inset-x-0 bottom-0 rounded-t-[3px]"
                          style={{
                            height: `${(d[c].filled / maxBeds) * 100}%`,
                            background:
                              c === "makkah" ? "var(--color-haram)" : "var(--color-saffron-deep)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-ink-3">
                    {digits(Number(d.day.slice(8)), locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("bookings")}</h2>
        {activeHotels.length ? (
          <Reveal label={t("addBooking")}>
            <BookingForm hotels={activeHotels} />
          </Reveal>
        ) : (
          <p className="text-ink-3">{t("addHotelFirst")}</p>
        )}
        {bookings.length === 0 ? (
          <Card>
            <EmptyState title={t("noBookings")} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-[15px]">
                <thead className="bg-field text-left text-[13px] text-ink-3">
                  <tr>
                    <th className="px-5 py-3 font-normal">{t("hotel")}</th>
                    <th className="px-3 py-3 font-normal">{t("dates")}</th>
                    <th className="px-3 py-3 font-normal">{t("roomsCol")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("filled")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("total")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("paid")}</th>
                    <th className="px-5 py-3 font-normal">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className={`border-t border-[#eef3f2] hover:bg-field ${b.status === "cancelled" ? "text-ink-3" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/app/hotels/${b.id}`} className="flex items-center gap-3">
                          <HotelIcon size={26} tint="var(--color-unit-hotel-tint)" />
                          <span className="flex flex-col">
                            <b className="font-semibold hover:text-haram">{b.hotelName}</b>
                            <span className="text-[12px] text-ink-3">
                              {t(`cities.${b.city}`)} · <span className="font-mono">{b.ref}</span>
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[14px]">
                        {dateText(b.checkIn, locale)} → {dateText(b.checkOut, locale)}
                        <span className="block text-[12px] text-ink-3">
                          {t("nightsN", { n: digits(b.nights, locale) })}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[14px]">
                        {digits(b.rooms, locale)} × {t(`roomTypes.${b.roomType}`)}
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        <b className={b.assigned >= b.beds ? "text-paid" : ""}>
                          {digits(b.assigned, locale)}
                        </b>{" "}
                        / {digits(b.beds, locale)}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-semibold">
                        {money(b.total, locale, b.currency)}
                      </td>
                      <td
                        className={`tabular px-3 py-3 text-right ${b.paid >= b.total ? "text-paid" : "text-due"}`}
                      >
                        {money(b.paid, locale, b.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[b.status]}>{t(`statuses.${b.status}`)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("hotels")}</h2>
        <Reveal label={t("addHotel")} variant="outline">
          <HotelForm />
        </Reveal>
        {hotels.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hotels.map((h) => (
              <Card
                key={h.id}
                className={`flex flex-col gap-1 rounded-[40px_40px_16px_16px] border-t-4 border-unit-hotel px-6 pt-6 pb-5 ${h.active ? "" : "opacity-60"}`}
              >
                <b className="text-[17px]">{h.name}</b>
                <span className="text-[14px] text-ink-2">
                  {t(`cities.${h.city}`)}
                  {h.distance ? ` · ${h.distance}` : ""}
                </span>
                {h.address || h.phone ? (
                  <span className="text-[13px] text-ink-3">
                    {[h.address, h.phone].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
                <span className="mt-1 text-[13px] text-ink-3">
                  {t("bookingsN", { n: digits(h.bookings, locale) })}
                </span>
                <div className="mt-2">
                  <Reveal
                    label={t("editHotel")}
                    variant="outline"
                    className="h-10 text-sm"
                    plus={false}
                  >
                    <HotelForm initial={h} />
                  </Reveal>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </PageBody>
  );
}
