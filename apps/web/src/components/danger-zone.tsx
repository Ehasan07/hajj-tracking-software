"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { FormError } from "@/components/form-error";
import { Button, Field } from "@/components/ui";

/**
 * A step that can't be undone (erasing someone's details, deleting an
 * account): one button opens what will happen, an optional word or password
 * to type, and the final red button.
 */
export function DangerZone({
  id,
  title,
  body,
  button,
  confirm,
  typeLabel,
  typeKind = "text",
  error,
  pending,
  onConfirm,
  compact = false,
}: {
  id: string;
  title?: string;
  body: ReactNode;
  button: string;
  confirm: string;
  /** When set, the person must type something (a reference, their password) before confirming. */
  typeLabel?: string;
  typeKind?: "text" | "password";
  error?: unknown;
  pending: boolean;
  onConfirm: (typed: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("erase");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  if (!open) {
    return (
      <div className={compact ? "" : "flex flex-col gap-2"}>
        {title ? <h2 className="text-lg font-bold">{title}</h2> : null}
        <Button type="button" variant="danger" className={compact ? "h-9 px-3 text-sm" : "self-start"} onClick={() => setOpen(true)}>
          {button}
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-md border-[1.5px] border-due bg-due-tint/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(typed);
      }}
    >
      {title ? <h2 className="text-lg font-bold text-due">{title}</h2> : null}
      <p className="text-[15px] text-ink-2">{body}</p>
      {typeLabel ? (
        <Field
          id={`${id}-confirm`}
          type={typeKind}
          required
          autoComplete={typeKind === "password" ? "current-password" : "off"}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          label={typeLabel}
        />
      ) : null}
      <FormError error={error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="danger" disabled={pending || (typeLabel ? !typed.trim() : false)} className="border-due bg-due text-white hover:bg-due">
          {confirm}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
