"use client";

import { checkPassword, generatePassword, type PasswordContext, type PasswordRule } from "@hajj/core";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type InputHTMLAttributes } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, SparkIcon } from "./icons";
import { fieldClass } from "./ui";

/** The checklist order. `symbol` is optional and says so. */
const SHOWN_RULES: PasswordRule[] = ["length", "upper", "lower", "number", "symbol", "notCommon", "notPersonal"];

const LEVEL_STYLE = [
  { bar: "bg-due", text: "text-due" },
  { bar: "bg-due", text: "text-due" },
  { bar: "bg-saffron-deep", text: "text-saffron-ink" },
  { bar: "bg-paid", text: "text-paid" },
  { bar: "bg-paid", text: "text-paid" },
] as const;

/** Uniform integer in [0, max) from the browser's crypto, without modulo bias. */
function secureRandom(max: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limit);
  return buf[0]! % max;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange">;

interface PasswordFieldProps extends InputProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Show the strength meter and the rule checklist (for a new password). */
  meter?: boolean;
  /** Name and email the password must not be built from. */
  context?: PasswordContext;
  /** For a "type it again" field: says whether the two match. */
  matchWith?: string;
  /** Offer to fill in a strong random password (for one made for someone else). */
  generate?: boolean;
}

/**
 * A password input with a show/hide button. For a new password it also shows
 * a strength meter and the rules, ticking each off as it is met; the server
 * applies the same rules (`checkPassword` in @hajj/core).
 */
export function PasswordField({
  id,
  label,
  hint,
  error,
  value: controlled,
  onValueChange,
  meter = false,
  context,
  matchWith,
  generate = false,
  className = "",
  ...props
}: PasswordFieldProps) {
  const t = useTranslations("password");
  const [inner, setInner] = useState("");
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState<string>();
  const value = controlled ?? inner;
  const set = (next: string) => {
    if (controlled === undefined) setInner(next);
    onValueChange?.(next);
  };
  const uid = useId();
  const rulesId = `${id}-rules-${uid}`;
  const check = useMemo(() => checkPassword(value, context), [value, context]);
  const style = LEVEL_STYLE[check.score];
  const filled = value ? Math.max(1, check.score) : 0;
  const matches = matchWith !== undefined && value.length > 0 ? value === matchWith : undefined;

  const describedBy = [hint ? `${id}-hint` : null, meter ? rulesId : null, matches !== undefined ? `${id}-match` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {generate ? (
          <button
            type="button"
            onClick={() => {
              set(generatePassword(secureRandom));
              setVisible(true);
              setNotice(t("generated"));
            }}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-haram underline-offset-4 hover:underline"
          >
            <SparkIcon size={16} accent="var(--color-saffron-deep)" />
            {t("generate")}
          </button>
        ) : null}
      </div>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => {
            set(e.target.value);
            setNotice(undefined);
          }}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`${fieldClass} h-12 pr-13 ${visible ? "font-mono tracking-wide" : ""} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hide") : t("show")}
          aria-pressed={visible}
          aria-controls={id}
          title={visible ? t("hide") : t("show")}
          className="absolute top-1/2 right-1.5 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-ink-3 transition-colors hover:bg-ground hover:text-ink focus-visible:text-ink"
        >
          {visible ? <EyeOffIcon size={21} /> : <EyeIcon size={21} accent="var(--color-haram)" />}
        </button>
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-3">
          {hint}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-[13px] font-semibold text-haram">
          {notice}
        </p>
      ) : null}

      {matches !== undefined ? (
        <p id={`${id}-match`} className={`flex items-center gap-1.5 text-[13px] font-semibold ${matches ? "text-paid" : "text-due"}`}>
          {matches ? <CheckIcon size={15} /> : <span aria-hidden="true">✕</span>}
          {matches ? t("match") : t("mismatch")}
        </p>
      ) : null}

      {meter ? (
        <div id={rulesId} className="mt-1 flex flex-col gap-2.5 rounded-md border border-line bg-paper px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={`h-1.5 rounded-full transition-colors duration-300 ${n <= filled ? style.bar : "bg-line"}`} />
              ))}
            </div>
            <p aria-live="polite" className={`min-w-[7.5rem] text-right text-[13px] font-semibold ${value ? style.text : "text-ink-3"}`}>
              {t("strength", { level: value ? (t.raw("levels") as string[])[check.score]! : "—" })}
            </p>
          </div>
          <p className="text-[13px] font-semibold text-ink-2">{t("rulesTitle")}</p>
          <ul className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
            {SHOWN_RULES.map((rule) => {
              const met = value.length > 0 && check.rules[rule];
              const optional = rule === "symbol";
              return (
                <li
                  key={rule}
                  className={`flex items-start gap-2 text-[13px] leading-snug ${met ? "text-paid" : "text-ink-3"} ${rule === "notCommon" || optional ? "sm:col-span-2" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${met ? "border-paid bg-paid text-white" : "border-line-strong"}`}
                  >
                    {met ? <CheckIcon size={10} strokeWidth={3.2} /> : null}
                  </span>
                  <span>
                    {t(`rules.${rule}`)}
                    {optional ? <span className="text-ink-3"> · {t("optionalStronger")}</span> : null}
                    <span className="sr-only"> — {met ? t("passed") : t("missing")}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-semibold text-due">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Whether a new password passes every rule, for a form to check before it submits. */
export function passwordReady(password: string, context?: PasswordContext) {
  return checkPassword(password, context).ok;
}
