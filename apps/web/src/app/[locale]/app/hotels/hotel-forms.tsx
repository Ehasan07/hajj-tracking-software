"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { bookingTotal, parseAmount } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { digits, money, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

const ROOM_TYPES = ["double", "triple", "quad", "quint"] as const;
const STATUSES = ["tentative", "confirmed", "cancelled"] as const;
const METHODS = ["bank", "cash", "bkash", "nagad", "rocket", "card", "other"] as const;

export function HotelForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    city: "makkah" | "madinah" | "other";
    address: string | null;
    distance: string | null;
    phone: string | null;
    notes: string | null;
    active: boolean;
  };
}) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const save = useMutation(
    trpc.hotels.saveHotel.mutationOptions({
      onSuccess: () => {
        if (!initial) form.current?.reset();
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        save.mutate({
          id: initial?.id,
          name: s("name"),
          city: s("city") as "makkah" | "madinah" | "other",
          address: s("address") || undefined,
          distance: s("distance") || undefined,
          phone: s("phone") || undefined,
          notes: s("notes") || undefined,
          active: initial ? f.get("active") === "on" : true,
        });
      }}
    >
      <Field
        id="ht-name"
        name="name"
        required
        minLength={2}
        label={t("hotelName")}
        defaultValue={initial?.name}
      />
      <SelectField
        id="ht-city"
        name="city"
        label={t("city")}
        defaultValue={initial?.city ?? "makkah"}
      >
        {(["makkah", "madinah", "other"] as const).map((c) => (
          <option key={c} value={c}>
            {t(`cities.${c}`)}
          </option>
        ))}
      </SelectField>
      <Field
        id="ht-distance"
        name="distance"
        label={t("distance")}
        placeholder={t("distanceHint")}
        defaultValue={initial?.distance ?? ""}
      />
      <Field
        id="ht-address"
        name="address"
        label={t("address")}
        defaultValue={initial?.address ?? ""}
      />
      <Field id="ht-phone" name="phone" label={t("phone")} defaultValue={initial?.phone ?? ""} />
      <Field id="ht-notes" name="notes" label={t("notes")} defaultValue={initial?.notes ?? ""} />
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        {initial ? (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial.active}
              className="h-5 w-5 accent-haram"
            />
            <span className="font-semibold">{t("active")}</span>
          </label>
        ) : null}
        <FormError error={save.error} />
        <Button type="submit" disabled={save.isPending} className="self-start">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

export interface BookingValues {
  id: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  roomType: (typeof ROOM_TYPES)[number];
  rooms: number;
  rate: number;
  currency: "SAR" | "BDT";
  supplier: string | null;
  status: (typeof STATUSES)[number];
  notes: string | null;
}

export function BookingForm({
  hotels,
  initial,
}: {
  hotels: { id: string; name: string; city: string }[];
  initial?: BookingValues;
}) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [rooms, setRooms] = useState(String(initial?.rooms ?? 1));
  const [rate, setRate] = useState(initial ? String(initial.rate / 100) : "");
  const [currency, setCurrency] = useState<"SAR" | "BDT">(initial?.currency ?? "SAR");
  const save = useMutation(
    trpc.hotels.saveBooking.mutationOptions({
      onSuccess: (row) => {
        if (!initial) router.push(`/app/hotels/${row.id}`);
        router.refresh();
      },
    }),
  );
  let total: number | null = null;
  let nightsN = 0;
  try {
    total = bookingTotal({ checkIn, checkOut, rooms: Number(rooms), rate: parseAmount(rate) });
    nightsN = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 864e5);
  } catch {
    total = null;
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        save.mutate({
          id: initial?.id,
          hotelId: s("hotelId"),
          checkIn,
          checkOut,
          roomType: s("roomType") as (typeof ROOM_TYPES)[number],
          rooms: Number(rooms),
          rate,
          currency,
          supplier: s("supplier") || undefined,
          status: s("status") as (typeof STATUSES)[number],
          notes: s("notes") || undefined,
        });
      }}
    >
      <SelectField
        id="bk-hotel"
        name="hotelId"
        required
        label={t("hotel")}
        defaultValue={initial?.hotelId ?? hotels[0]?.id}
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} · {t(`cities.${h.city}`)}
          </option>
        ))}
      </SelectField>
      <Field
        id="bk-in"
        type="date"
        required
        value={checkIn}
        onChange={(e) => setCheckIn(e.target.value)}
        label={t("checkIn")}
      />
      <Field
        id="bk-out"
        type="date"
        required
        min={checkIn || undefined}
        value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)}
        label={t("checkOut")}
      />
      <SelectField
        id="bk-status"
        name="status"
        label={t("status")}
        defaultValue={initial?.status ?? "tentative"}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`statuses.${s}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="bk-type"
        name="roomType"
        label={t("roomType")}
        defaultValue={initial?.roomType ?? "quad"}
      >
        {ROOM_TYPES.map((r) => (
          <option key={r} value={r}>
            {t(`roomTypes.${r}`)}
          </option>
        ))}
      </SelectField>
      <Field
        id="bk-rooms"
        type="number"
        min={1}
        max={500}
        required
        value={rooms}
        onChange={(e) => setRooms(e.target.value)}
        label={t("rooms")}
      />
      <Field
        id="bk-rate"
        inputMode="decimal"
        required
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        label={t("rate")}
      />
      <SelectField
        id="bk-cur"
        label={t("currency")}
        value={currency}
        onChange={(e) => setCurrency(e.target.value as "SAR" | "BDT")}
      >
        <option value="SAR">SAR ﷼</option>
        <option value="BDT">BDT ৳</option>
      </SelectField>
      <Field
        id="bk-supplier"
        name="supplier"
        label={t("supplier")}
        defaultValue={initial?.supplier ?? ""}
      />
      <div className="sm:col-span-2 lg:col-span-3">
        <TextAreaField
          id="bk-notes"
          name="notes"
          label={t("notes")}
          defaultValue={initial?.notes ?? ""}
          className="min-h-12"
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
        {total !== null ? (
          <p className="tabular rounded-md bg-unit-hotel-tint px-4 py-3 text-[15px]">
            {t("totalLine", {
              rooms: digits(Number(rooms), locale),
              nights: digits(nightsN, locale),
              rate: money(parseAmount(rate), locale, currency),
            })}{" "}
            = <b className="text-lg">{money(total, locale, currency)}</b>
          </p>
        ) : null}
        <FormError error={save.error} />
        <Button type="submit" disabled={save.isPending || !hotels.length} className="self-start">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

export function AssignForm({
  bookingId,
  roomNo,
  candidates,
}: {
  bookingId: string;
  roomNo: string;
  candidates: { id: string; ref: string; fullName: string; gender: string | null }[];
}) {
  const t = useTranslations("hotels");
  const trpc = useTRPC();
  const router = useRouter();
  const [pilgrimId, setPilgrimId] = useState("");
  const assign = useMutation(
    trpc.hotels.assign.mutationOptions({
      onSuccess: () => {
        setPilgrimId("");
        router.refresh();
      },
    }),
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={pilgrimId}
          onChange={(e) => setPilgrimId(e.target.value)}
          aria-label={t("addPilgrim")}
          className="h-10 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong bg-field px-2 text-[14px] outline-none focus:border-haram"
        >
          <option value="">{t("addPilgrim")}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName} · {c.ref}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="h-10 px-4 text-sm"
          disabled={!pilgrimId || assign.isPending}
          onClick={() => assign.mutate({ bookingId, pilgrimId, roomNo })}
        >
          +
        </Button>
      </div>
      <FormError error={assign.error} />
    </div>
  );
}

export function UnassignButton({ id }: { id: string }) {
  const t = useTranslations("hotels");
  const trpc = useTRPC();
  const router = useRouter();
  const remove = useMutation(
    trpc.hotels.unassign.mutationOptions({ onSuccess: () => router.refresh() }),
  );
  return (
    <button
      type="button"
      aria-label={t("remove")}
      disabled={remove.isPending}
      onClick={() => remove.mutate({ id })}
      className="h-7 w-7 rounded-full text-ink-3 hover:bg-due-tint hover:text-due"
    >
      ✕
    </button>
  );
}

export function PayHotelForm({
  bookingId,
  currency,
  due,
  today,
}: {
  bookingId: string;
  currency: "SAR" | "BDT";
  due: number;
  today: string;
}) {
  const t = useTranslations("hotels");
  const tm = useTranslations("methods");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const pay = useMutation(
    trpc.hotels.pay.mutationOptions({
      onSuccess: () => {
        form.current?.reset();
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        pay.mutate({
          bookingId,
          amount: s("amount"),
          method: s("method") as (typeof METHODS)[number],
          reference: s("reference") || undefined,
          note: s("note") || undefined,
          date: s("date") !== today ? s("date") : undefined,
        });
      }}
    >
      <Field
        id="hp-amount"
        name="amount"
        required
        inputMode="decimal"
        label={`${t("amount")} (${currency})`}
        hint={`${t("due")}: ${money(due, locale, currency)}`}
      />
      <SelectField id="hp-method" name="method" label={t("paidBy")} defaultValue="bank">
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {tm(m)}
          </option>
        ))}
      </SelectField>
      <Field id="hp-ref" name="reference" label={t("reference")} />
      <Field id="hp-note" name="note" label={t("notes")} />
      <Field
        id="hp-date"
        name="date"
        type="date"
        max={today}
        defaultValue={today}
        label={t("date")}
      />
      <FormError error={pay.error} />
      <Button type="submit" disabled={pay.isPending || due <= 0} className="self-start">
        {t("pay")}
      </Button>
    </form>
  );
}
