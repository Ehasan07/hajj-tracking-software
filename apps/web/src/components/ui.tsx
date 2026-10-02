import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Variant = "primary" | "saffron" | "outline" | "quiet" | "danger";

const variants: Record<Variant, string> = {
  primary: "lift bg-haram text-white shadow-[inset_0_-3px_0_var(--color-haram-deep)] hover:bg-haram-deep",
  saffron: "lift bg-saffron text-ink font-bold shadow-[inset_0_-3px_0_var(--color-saffron-deep)]",
  outline: "border-[1.5px] border-ink bg-paper text-ink hover:bg-ground",
  quiet: "text-haram underline underline-offset-4 hover:text-haram-deep",
  danger: "border-[1.5px] border-due bg-paper text-due hover:bg-due-tint",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-55 ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const fieldClass =
  "w-full rounded-md border-[1.5px] border-line-strong bg-field px-4 text-[17px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-3/70 focus:border-haram focus:bg-paper focus:shadow-[0_0_0_4px_var(--color-haram-tint)] aria-[invalid=true]:border-due";

interface FieldChrome {
  label: string;
  hint?: ReactNode;
  error?: string;
  id: string;
}

function FieldFrame({ label, hint, error, id, children }: FieldChrome & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
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

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function Field({ label, hint, error, id, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & FieldChrome) {
  return (
    <FieldFrame label={label} hint={hint} error={error} id={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${fieldClass} h-12 ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldChrome) {
  return (
    <FieldFrame label={label} hint={hint} error={error} id={id}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${fieldClass} h-12 appearance-none pr-11 ${className}`}
          {...props}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome) {
  return (
    <FieldFrame label={label} hint={hint} error={error} id={id}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${fieldClass} min-h-24 py-3 leading-relaxed ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

type Tone = "paid" | "due" | "pending" | "info" | "neutral";

const tones: Record<Tone, string> = {
  paid: "bg-paid-tint text-paid",
  due: "bg-due-tint text-due",
  pending: "bg-saffron-tint text-saffron-ink",
  info: "bg-unit-zamzam-tint text-[#1b4f8f]",
  neutral: "bg-ground text-ink-2",
};

const dots: Record<Tone, string> = {
  paid: "bg-paid",
  due: "bg-due",
  pending: "bg-saffron",
  info: "bg-unit-zamzam",
  neutral: "bg-ink-3",
};

export function Badge({ tone = "neutral", children, pulse = false }: { tone?: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]} ${pulse ? "animate-ripple" : ""}`} />
      {children}
    </span>
  );
}

export function RefChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-ground px-3 font-mono text-[12px] tracking-wide text-ink-2">
      {children}
    </span>
  );
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-lg bg-paper ${className}`} {...props} />;
}

/** The khatam: two squares, one turned 45°. Brand mark, loading indicator and quiet background motif. */
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

export function Spinner({ label, className = "h-6 w-6" }: { label: string; className?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-ink-3">
      <Khatam className={`${className} animate-[turn_1.6s_linear_infinite] text-saffron`} strokeWidth={8} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Arch-topped badge holding an icon, tinted per business unit. */
export function ArchTile({ tint, children, className = "" }: { tint: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-[52px] w-12 shrink-0 items-center justify-center rounded-[24px_24px_10px_10px] ${className}`}
      style={{ background: tint }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Khatam className="h-14 w-14 text-line-strong" strokeWidth={3} />
      <p className="text-lg font-semibold">{title}</p>
      {body ? <p className="max-w-sm text-[15px] text-ink-3">{body}</p> : null}
      {action}
    </div>
  );
}
