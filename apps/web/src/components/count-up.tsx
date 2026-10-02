"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, type Currency, type Locale } from "@hajj/core";

/** Money that counts up from zero on first paint. Respects reduced-motion. */
export function CountUp({
  value,
  locale,
  currency = "BDT",
  duration = 1100,
}: {
  value: number;
  locale: Locale;
  currency?: Currency;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      // Round to whole taka while counting; land exactly on the real value.
      setShown(t < 1 ? Math.round((value * eased) / 100) * 100 : value);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    setShown(0);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return (
    <span className="tabular" aria-label={formatMoney(value, currency, locale, { compactFraction: true })}>
      <span aria-hidden="true">{formatMoney(shown, currency, locale, { compactFraction: true })}</span>
    </span>
  );
}
