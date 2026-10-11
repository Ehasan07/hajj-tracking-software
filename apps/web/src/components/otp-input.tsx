"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Six boxes for a one-time code. Typing moves to the next box, Backspace to
 * the previous one, and pasting the whole code fills every box. The first box
 * carries `autocomplete="one-time-code"` so phones can fill it from the email.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  label,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  label: string;
  invalid?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function set(next: string) {
    const clean = next.replace(/[^0-9০-৯]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  }

  function onInput(i: number, raw: string) {
    const typed = raw.replace(/\D/g, "").slice(-1);
    if (!typed) return;
    const next = set((value.slice(0, i) + typed + value.slice(i + 1)).slice(0, 6));
    boxes.current[Math.min(next.length, 5)]?.focus();
  }

  function onKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) set(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        set(value.slice(0, i - 1) + value.slice(i));
        boxes.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) boxes.current[i + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const next = set(e.clipboardData.getData("text"));
    boxes.current[Math.min(next.length, 5)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={d}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={`tabular h-14 w-full min-w-0 rounded-md border-[1.5px] bg-field text-center font-mono text-2xl font-bold text-ink outline-none transition-[border-color,box-shadow] focus:border-haram focus:bg-paper focus:shadow-[0_0_0_4px_var(--color-haram-tint)] sm:h-16 ${
            invalid ? "border-due" : d ? "border-haram" : "border-line-strong"
          }`}
        />
      ))}
    </div>
  );
}
