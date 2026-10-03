"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { parseAmount, type ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { digits, money, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

export function RouteNameForm({ unit, id, name }: { unit: ShopUnit; id: string; name: string }) {
  const t = useTranslations("shop.routes");
  const trpc = useTRPC();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const save = useMutation(
    trpc.shop.saveRoute.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        router.refresh();
      },
    }),
  );
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="self-start text-[13px] font-semibold text-haram underline underline-offset-4"
      >
        {t("rename")}
      </button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          unit,
          id,
          name: String(new FormData(e.currentTarget).get("name") ?? "").trim(),
        });
      }}
    >
      <input
        name="name"
        defaultValue={name}
        autoFocus
        aria-label={t("name")}
        placeholder={t("name")}
        className="h-10 rounded-md border-[1.5px] border-line-strong px-3 outline-none focus:border-haram"
      />
      <FormError error={save.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending} className="h-10 px-4 text-sm">
          ✓
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-10 rounded-md px-3 text-sm text-ink-2"
        >
          ✕
        </button>
      </div>
    </form>
  );
}

const amount = (text: string) => {
  if (!text.trim()) return 0;
  try {
    return parseAmount(text);
  } catch {
    return null;
  }
};

/** One shop on today's route: how many of each product went in, what was paid now, and any old due collected. */
export function DeliverForm({
  unit,
  routeId,
  customerId,
  balance,
  products,
  date,
  today,
}: {
  unit: ShopUnit;
  routeId: string;
  customerId: string;
  balance: number;
  products: { id: string; name: string; price: number; stockQty: number; trackStock: boolean }[];
  date: string;
  today: string;
}) {
  const t = useTranslations("shop.routes");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState("");
  const [collect, setCollect] = useState("");
  const sell = useMutation(trpc.shop.sell.mutationOptions());
  const collectDue = useMutation(trpc.shop.collect.mutationOptions());

  const lines = products.map((p) => ({ p, n: Number(qty[p.id] || 0) })).filter((l) => l.n > 0);
  const total = lines.reduce((a, l) => a + l.n * l.p.price, 0);
  const paidNow = amount(paid);
  const collectNow = amount(collect);
  const bad =
    paidNow === null ||
    collectNow === null ||
    (paidNow ?? 0) > total ||
    (collectNow ?? 0) > Math.max(balance, 0);
  const busy = sell.isPending || collectDue.isPending;

  async function submit() {
    if (bad || (!lines.length && !collectNow)) return;
    const day = date !== today ? date : undefined;
    if (lines.length) {
      await sell.mutateAsync({
        unit,
        routeId,
        customerId,
        items: lines.map((l) => ({ productId: l.p.id, qty: l.n })),
        paid: paid.trim() || "0",
        method: "cash",
        date: day,
      });
    }
    if (collectNow)
      await collectDue.mutateAsync({
        unit,
        customerId,
        amount: collect,
        method: "cash",
        date: day,
      });
    setQty({});
    setPaid("");
    setCollect("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-md bg-ground p-4">
      <div className="flex flex-wrap gap-3">
        {products.map((p) => (
          <label key={p.id} className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">
              {p.name} <span className="font-normal text-ink-3">· {money(p.price, locale)}</span>
            </span>
            <input
              type="number"
              min={0}
              max={p.trackStock ? p.stockQty : undefined}
              inputMode="numeric"
              value={qty[p.id] ?? ""}
              onChange={(e) => setQty((q) => ({ ...q, [p.id]: e.target.value }))}
              placeholder="0"
              className="tabular h-11 w-28 rounded-md border-[1.5px] border-line-strong bg-paper px-3 text-lg font-semibold outline-none focus:border-haram"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">{t("paidNow")}</span>
          <input
            inputMode="decimal"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="0"
            className="tabular h-11 w-32 rounded-md border-[1.5px] border-line-strong bg-paper px-3 outline-none focus:border-haram"
          />
        </label>
        {balance > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">{t("collectDue")}</span>
            <input
              inputMode="decimal"
              value={collect}
              onChange={(e) => setCollect(e.target.value)}
              placeholder="0"
              className="tabular h-11 w-32 rounded-md border-[1.5px] border-line-strong bg-paper px-3 outline-none focus:border-haram"
            />
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {total > 0 ? (
          <span className="tabular text-[15px]">
            {digits(
              lines.reduce((a, l) => a + l.n, 0),
              locale,
            )}{" "}
            × → <b>{money(total, locale)}</b>
            {paidNow !== null && total - paidNow > 0 ? (
              <span className="text-due"> · {money(total - paidNow, locale)}</span>
            ) : null}
          </span>
        ) : null}
        <Button
          type="button"
          onClick={submit}
          disabled={busy || bad || (!lines.length && !collectNow)}
          className="ml-auto h-11"
        >
          {t("save")}
        </Button>
      </div>
      <FormError error={sell.error ?? collectDue.error} />
    </div>
  );
}
