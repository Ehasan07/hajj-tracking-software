import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "quiet";

const variants: Record<Variant, string> = {
  primary:
    "bg-zamzam text-white shadow-[inset_0_-2px_0_var(--color-zamzam-deep)] hover:bg-zamzam-deep disabled:opacity-60",
  outline: "border border-ink bg-paper text-ink hover:bg-marble",
  quiet: "text-zamzam underline underline-offset-4 hover:text-zamzam-deep",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string; id: string }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="h-12 rounded-t-md border border-line-strong border-b-2 border-b-ink bg-[#fbfaf7] px-3.5 text-[17px] outline-none transition-colors focus:border-b-zamzam focus:bg-paper aria-[invalid=true]:border-b-due"
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-semibold text-due">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The khatam: two squares, one turned 45°. Used as the brand mark and as a quiet background motif. */
export function Khatam({ className = "", strokeWidth = 5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
        <rect x="22" y="22" width="56" height="56" />
        <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
      </g>
    </svg>
  );
}
