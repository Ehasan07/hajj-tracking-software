"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { parseAmount, type ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { SearchIcon } from "@/components/icons";
import { Button, buttonClass, Field, SelectField } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { UNIT_THEME } from "@/lib/units";
import { useTRPC } from "@/trpc/react";

export interface PosProduct {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  genericName: string | null;
  strength: string | null;
  unitLabel: string;
  price: number;
  trackStock: boolean;
  stockQty: number;
  nextExpiry: string | null;
}

interface Line {
  qty: number;
  priceText: string;
}

const METHODS = ["cash", "bkash", "nagad", "rocket", "card", "bank", "other"] as const;
type Method = (typeof METHODS)[number];

/** Typed amount to paisa, or null while it isn't a valid amount yet. */
function toMinor(text: string): number | null {
  if (!text.trim()) return 0;
  try {
    const v = parseAmount(text);
    return v >= 0 ? v : null;
  } catch {
    return null;
  }
}
const asText = (minor: number) =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);

export function PosClient({
  unit,
  today,
  canBackdate,
  products,
  customers,
}: {
  unit: ShopUnit;
  today: string;
  canBackdate: boolean;
  products: PosProduct[];
  customers: { id: string; name: string; area: string | null; balance: number }[];
}) {
  const t = useTranslations("shop.pos");
  const tm = useTranslations("methods");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const search = useRef<HTMLInputElement>(null);
  const theme = UNIT_THEME[unit];

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, Line>>(new Map());
  const [customerId, setCustomerId] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [paidText, setPaidText] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [done, setDone] = useState<{ id: string; ref: string } | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean) as string[])],
    [products],
  );
  const needle = q.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (!needle ||
        [p.name, p.code ?? "", p.genericName ?? ""].some((v) => v.toLowerCase().includes(needle))),
  );

  const lines = [...cart.entries()].map(([id, line]) => ({
    product: byId.get(id)!,
    ...line,
    price: toMinor(line.priceText),
  }));
  const subtotal = lines.reduce((a, l) => a + (l.price ?? 0) * l.qty, 0);
  const discount = toMinor(discountText);
  const total = subtotal - (discount ?? 0);
  const paid = paidText === null ? total : toMinor(paidText);
  const due = paid === null ? 0 : total - paid;
  const invalid =
    lines.length === 0 ||
    lines.some((l) => l.price === null) ||
    discount === null ||
    discount > subtotal ||
    paid === null ||
    paid > total ||
    paid < 0;
  const needsCustomer = due > 0 && !customerId;

  function add(p: PosProduct) {
    setDone(null);
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(p.id);
      const qty = (line?.qty ?? 0) + 1;
      if (p.trackStock && qty > p.stockQty) return prev;
      next.set(p.id, { qty, priceText: line?.priceText ?? asText(p.price) });
      return next;
    });
  }
  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const p = byId.get(id)!;
      if (qty <= 0) next.delete(id);
      else next.set(id, { ...next.get(id)!, qty: p.trackStock ? Math.min(qty, p.stockQty) : qty });
      return next;
    });
  }
  function reset() {
    setCart(new Map());
    setDiscountText("");
    setPaidText(null);
    setReference("");
    setNote("");
    setCustomerId("");
    setMethod("cash");
  }

  const sell = useMutation(
    trpc.shop.sell.mutationOptions({
      onSuccess: (sale) => {
        setDone({ id: sale.id, ref: sale.ref });
        reset();
        router.refresh();
        search.current?.focus();
      },
    }),
  );

  function submit() {
    if (invalid || needsCustomer) return;
    sell.mutate({
      unit,
      items: lines.map((l) => ({
        productId: l.product.id,
        qty: l.qty,
        ...(l.price !== l.product.price ? { unitPrice: l.priceText } : {}),
      })),
      customerId: customerId || undefined,
      discount: discount ? discountText : undefined,
      paid: paidText === null ? undefined : paidText || "0",
      method,
      reference: reference || undefined,
      note: note || undefined,
      date: date !== today ? date : undefined,
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="flex min-w-0 flex-col gap-4">
        <label className="flex h-14 items-center gap-3 rounded-lg border-[1.5px] border-line-strong bg-paper px-4 focus-within:border-haram">
          <SearchIcon size={22} className="text-haram" />
          <input
            ref={search}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              // A barcode scanner types the code and presses Enter.
              if (e.key !== "Enter") return;
              e.preventDefault();
              const exact = products.find((p) => p.code && p.code.toLowerCase() === needle);
              const pick = exact ?? (shown.length === 1 ? shown[0] : undefined);
              if (pick) {
                add(pick);
                setQ("");
              }
            }}
            placeholder={unit === "medicine" ? t("search") : t("searchSimple")}
            aria-label={unit === "medicine" ? t("search") : t("searchSimple")}
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
          />
        </label>

        {categories.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCategory(c)}
                className={`h-9 rounded-full px-4 text-sm font-semibold ${category === c ? "text-white" : "bg-paper text-ink-2 hover:bg-ground"}`}
                style={category === c ? { background: theme.color } : undefined}
              >
                {c ?? t("allCategories")}
              </button>
            ))}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-lg bg-paper px-6 py-12 text-center">
            <p className="text-lg font-semibold">{t("noProducts")}</p>
            <p className="mt-1 text-ink-3">{t("addProducts")}</p>
            <Link href={`/app/shop/${unit}/products`} className={buttonClass("outline", "mt-4")}>
              {t("goProducts")} →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => {
              const inCart = cart.get(p.id)?.qty ?? 0;
              const empty = p.trackStock && p.stockQty - inCart <= 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => add(p)}
                    disabled={empty}
                    className="lift relative flex h-full w-full flex-col gap-1 rounded-[22px_22px_12px_12px] border-t-4 bg-paper p-4 text-left disabled:opacity-50"
                    style={{ borderColor: theme.color }}
                  >
                    {inCart ? (
                      <span
                        className="absolute top-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold text-white"
                        style={{ background: theme.color }}
                      >
                        {digits(inCart, locale)}
                      </span>
                    ) : null}
                    <span className="pr-8 text-[15px] leading-snug font-bold">{p.name}</span>
                    {p.genericName || p.strength ? (
                      <span className="text-[12px] text-ink-3">
                        {[p.genericName, p.strength].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    <span className="tabular mt-auto pt-1 text-lg font-bold">
                      {money(p.price, locale)}
                      <span className="text-[12px] font-normal text-ink-3"> / {p.unitLabel}</span>
                    </span>
                    <span
                      className={`text-[12px] font-semibold ${empty ? "text-due" : "text-ink-3"}`}
                    >
                      {!p.trackStock
                        ? t("noStockTracking")
                        : empty
                          ? t("outOfStock")
                          : t("inStock", { n: digits(p.stockQty - inCart, locale) })}
                    </span>
                    {p.nextExpiry ? (
                      <span className="text-[11px] text-ink-3">
                        {t("expiresSoon", { date: dateText(p.nextExpiry, locale) })}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-4 rounded-lg bg-paper p-5 lg:sticky lg:top-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">{t("cart")}</h2>
          {lines.length ? (
            <span className="text-[13px] text-ink-3">
              {t("items", { n: digits(lines.length, locale) })}
            </span>
          ) : null}
        </div>

        {done ? (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-md bg-paid-tint px-4 py-3 text-paid"
          >
            <b>{t("sold", { ref: done.ref })}</b>
            <Link
              href={`/app/shop/${unit}/sales/${done.id}`}
              className="text-sm font-semibold underline underline-offset-4"
            >
              {t("printReceipt")}
            </Link>
          </div>
        ) : null}

        {lines.length === 0 ? (
          <p className="rounded-md bg-ground px-4 py-6 text-center text-ink-3">{t("emptyCart")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {lines.map((l) => (
              <li key={l.product.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[15px] font-semibold">{l.product.name}</span>
                  <span className="tabular shrink-0 font-bold">
                    {l.price === null ? "—" : money(l.price * l.qty, locale)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border-[1.5px] border-line-strong">
                    <button
                      type="button"
                      aria-label="−"
                      onClick={() => setQty(l.product.id, l.qty - 1)}
                      className="h-9 w-9 text-lg font-bold"
                    >
                      −
                    </button>
                    <input
                      aria-label={t("qty")}
                      inputMode="numeric"
                      value={l.qty}
                      onChange={(e) =>
                        setQty(l.product.id, Number(e.target.value.replace(/\D/g, "")) || 0)
                      }
                      className="tabular h-9 w-12 bg-transparent text-center font-semibold outline-none"
                    />
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => setQty(l.product.id, l.qty + 1)}
                      className="h-9 w-9 text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-ink-3">×</span>
                  <input
                    aria-label={t("price")}
                    inputMode="decimal"
                    value={l.priceText}
                    onChange={(e) =>
                      setCart((prev) =>
                        new Map(prev).set(l.product.id, {
                          ...prev.get(l.product.id)!,
                          priceText: e.target.value,
                        }),
                      )
                    }
                    className={`tabular h-9 w-24 rounded-md border-[1.5px] px-2 text-right outline-none ${l.price === null ? "border-due" : "border-line-strong"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setQty(l.product.id, 0)}
                    className="ml-auto text-[13px] font-semibold text-ink-3 hover:text-due"
                  >
                    {t("remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <SelectField
          id="pos-customer"
          label={t("customer")}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">{t("walkIn")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.area ? ` · ${c.area}` : ""}
              {c.balance > 0 ? ` · ${money(c.balance, locale)}` : ""}
            </option>
          ))}
        </SelectField>

        <dl className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-[15px]">
          <dt className="text-ink-2">{t("subtotal")}</dt>
          <dd className="tabular text-right font-semibold">{money(subtotal, locale)}</dd>
          <dt>
            <label htmlFor="pos-discount" className="text-ink-2">
              {t("discount")}
            </label>
          </dt>
          <dd>
            <input
              id="pos-discount"
              inputMode="decimal"
              value={discountText}
              onChange={(e) => setDiscountText(e.target.value)}
              placeholder="0"
              className={`tabular h-10 w-28 rounded-md border-[1.5px] px-3 text-right outline-none ${discount === null || (discount ?? 0) > subtotal ? "border-due" : "border-line-strong"}`}
            />
          </dd>
          <dt className="text-lg font-bold">{t("total")}</dt>
          <dd className="tabular text-right text-2xl font-bold" style={{ color: theme.color }}>
            {money(Math.max(total, 0), locale)}
          </dd>
          <dt>
            <label htmlFor="pos-paid" className="text-ink-2">
              {t("paidNow")}
            </label>
          </dt>
          <dd>
            <input
              id="pos-paid"
              inputMode="decimal"
              value={paidText ?? asText(Math.max(total, 0))}
              onChange={(e) => setPaidText(e.target.value)}
              className={`tabular h-10 w-28 rounded-md border-[1.5px] px-3 text-right outline-none ${paid === null || (paid ?? 0) > total ? "border-due" : "border-line-strong"}`}
            />
          </dd>
          {due > 0 ? (
            <>
              <dt className="font-semibold text-due">{t("due")}</dt>
              <dd className="tabular text-right font-bold text-due">{money(due, locale)}</dd>
            </>
          ) : null}
        </dl>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaidText(null)}
            className="h-9 rounded-full bg-ground px-4 text-sm font-semibold"
          >
            {t("full")}
          </button>
          <button
            type="button"
            onClick={() => setPaidText("0")}
            className="h-9 rounded-full bg-ground px-4 text-sm font-semibold"
          >
            {t("credit")}
          </button>
        </div>

        {paid !== 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold">{t("method")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                  className={`h-9 rounded-full px-3.5 text-sm font-semibold ${method === m ? "bg-ink text-white" : "bg-ground text-ink-2"}`}
                >
                  {tm(m)}
                </button>
              ))}
            </div>
            {method !== "cash" ? (
              <Field
                id="pos-ref"
                label={t("reference")}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            ) : null}
          </fieldset>
        ) : null}

        <Field
          id="pos-note"
          label={t("note")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {canBackdate ? (
          <Field
            id="pos-date"
            type="date"
            max={today}
            label={t("date")}
            hint={t("dateHint")}
            value={date}
            onChange={(e) => setDate(e.target.value || today)}
          />
        ) : null}

        {needsCustomer ? (
          <p
            role="alert"
            className="rounded-md bg-saffron-tint px-4 py-2.5 text-[14px] font-semibold text-saffron-ink"
          >
            {t("customerNeeded")}
          </p>
        ) : null}
        <FormError error={sell.error} />
        <Button
          type="button"
          onClick={submit}
          disabled={invalid || needsCustomer || sell.isPending}
          className="h-14 text-lg"
        >
          {t("sell")}
        </Button>
      </aside>
    </div>
  );
}
