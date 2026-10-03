"use client";

import { useState, type ReactNode } from "react";
import { buttonClass } from "./ui";
import { PlusIcon } from "./icons";

/** A button that opens a form in place; the form closes itself through `close`. */
export function Reveal({
  label,
  variant = "primary",
  children,
  defaultOpen = false,
  className = "",
  plus = true,
}: {
  label: string;
  /** Show the + mark; off for "edit" buttons. */
  plus?: boolean;
  variant?: "primary" | "outline" | "saffron";
  children: ReactNode | ((close: () => void) => ReactNode);
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(variant, `self-start ${className}`)}
      >
        {plus ? <PlusIcon size={18} /> : null}
        {label}
      </button>
    );
  }
  return (
    <div className="flex animate-rise flex-col gap-4 rounded-lg border-[1.5px] border-line bg-paper p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{label}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md px-3 text-sm font-semibold text-ink-2 hover:bg-ground"
        >
          ✕
        </button>
      </div>
      {typeof children === "function" ? children(() => setOpen(false)) : children}
    </div>
  );
}
