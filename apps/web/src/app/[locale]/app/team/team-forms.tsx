"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { SHOP_UNITS, type BusinessUnit, type ShopUnit } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/react";

const ROLES = ["staff", "accountant", "shop_operator", "admin", "alim"] as const;
type Role = (typeof ROLES)[number];

export function UnitsForm({
  enabled,
  inPlan,
}: {
  enabled: BusinessUnit[];
  inPlan: BusinessUnit[];
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [on, setOn] = useState(new Set(enabled));
  const [saved, setSaved] = useState(false);
  const save = useMutation(
    trpc.team.setUnits.mutationOptions({ onSuccess: () => (setSaved(true), router.refresh()) }),
  );
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {SHOP_UNITS.map((u) => {
          const allowed = inPlan.includes(u);
          return (
            <li key={u}>
              <label
                className={`flex items-center gap-3 rounded-md border-[1.5px] px-4 py-3 ${on.has(u) ? "border-haram bg-haram-tint" : "border-line"} ${allowed ? "" : "opacity-55"}`}
              >
                <input
                  type="checkbox"
                  disabled={!allowed}
                  checked={on.has(u)}
                  onChange={(e) => {
                    setSaved(false);
                    const next = new Set(on);
                    if (e.target.checked) next.add(u);
                    else next.delete(u);
                    setOn(next);
                  }}
                  className="h-5 w-5 accent-haram"
                />
                <span className="flex flex-col">
                  <b>{t(`units.${u}`)}</b>
                  {!allowed ? (
                    <span className="text-[12px] text-ink-3">{t("team.notInPlan")}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <FormError error={save.error} />
      {saved && !save.error ? (
        <p className="text-[14px] font-semibold text-paid">{t("common.saved")}</p>
      ) : null}
      <Button
        type="button"
        className="self-start"
        disabled={save.isPending}
        onClick={() => save.mutate({ units: [...on] })}
      >
        {t("common.save")}
      </Button>
    </div>
  );
}

function UnitPicker({
  value,
  onChange,
  shops,
}: {
  value: ShopUnit[];
  onChange: (v: ShopUnit[]) => void;
  shops: ShopUnit[];
}) {
  const t = useTranslations();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t("team.whichShops")}</legend>
      <div className="flex flex-wrap gap-2">
        {shops.map((u) => (
          <label
            key={u}
            className={`flex h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-[14px] font-semibold ${value.includes(u) ? "border-haram bg-haram-tint" : "border-line"}`}
          >
            <input
              type="checkbox"
              checked={value.includes(u)}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, u] : value.filter((x) => x !== u))
              }
              className="h-4 w-4 accent-haram"
            />
            {t(`units.${u}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateLoginForm({ shops, isOwner }: { shops: ShopUnit[]; isOwner: boolean }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<Role>("shop_operator");
  const [units, setUnits] = useState<ShopUnit[]>(shops.slice(0, 1));
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const create = useMutation(trpc.team.create.mutationOptions());
  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setCreated(null);
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        await create.mutateAsync({
          name: s("name"),
          email: s("email"),
          password: String(f.get("password")),
          role,
          units: role === "shop_operator" ? units : [],
        });
        setCreated({ email: s("email").toLowerCase(), password: String(f.get("password")) });
        form.current?.reset();
        router.refresh();
      }}
    >
      <Field id="tm-name" name="name" required minLength={2} label={t("team.name")} />
      <Field
        id="tm-email"
        name="email"
        type="email"
        required
        autoComplete="off"
        label={t("team.email")}
      />
      <Field
        id="tm-password"
        name="password"
        type="text"
        required
        minLength={10}
        autoComplete="new-password"
        label={t("team.password")}
        hint={t("team.passwordHint")}
      />
      <SelectField
        id="tm-role"
        label={t("team.role")}
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        hint={t(`team.roleHints.${role}`)}
      >
        {ROLES.filter((r) => r !== "admin" || isOwner).map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </SelectField>
      {role === "shop_operator" ? (
        <div className="sm:col-span-2">
          <UnitPicker value={units} onChange={setUnits} shops={shops} />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError error={create.error} />
        {created ? (
          <p role="status" className="rounded-md bg-paid-tint px-4 py-3 text-[15px] text-paid">
            {t("team.created")} <b className="font-mono">{created.email}</b> ·{" "}
            <b className="font-mono">{created.password}</b>
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={create.isPending || (role === "shop_operator" && units.length === 0)}
          className="self-start"
        >
          {t("team.create")}
        </Button>
      </div>
    </form>
  );
}

export function MemberActions({
  memberId,
  role,
  units,
  shops,
  isOwner,
}: {
  memberId: string;
  role: string;
  units: ShopUnit[];
  shops: ShopUnit[];
  isOwner: boolean;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextRole, setNextRole] = useState<Role>(
    (ROLES as readonly string[]).includes(role) ? (role as Role) : "staff",
  );
  const [nextUnits, setNextUnits] = useState<ShopUnit[]>(units);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const done = { onSuccess: () => (setOpen(false), router.refresh()) };
  const update = useMutation(trpc.team.update.mutationOptions(done));
  const remove = useMutation(trpc.team.remove.mutationOptions(done));
  if (role === "owner" || (role === "admin" && !isOwner)) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-haram underline underline-offset-4"
      >
        {t("common.edit")}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-md bg-ground p-4 text-left">
      <SelectField
        id={`mr-${memberId}`}
        label={t("team.role")}
        value={nextRole}
        onChange={(e) => setNextRole(e.target.value as Role)}
      >
        {ROLES.filter((r) => r !== "admin" || isOwner).map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </SelectField>
      {nextRole === "shop_operator" ? (
        <UnitPicker value={nextUnits} onChange={setNextUnits} shops={shops} />
      ) : null}
      <FormError error={update.error ?? remove.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10 text-sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              memberId,
              role: nextRole,
              units: nextRole === "shop_operator" ? nextUnits : [],
            })
          }
        >
          {t("common.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 text-sm"
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}
        </Button>
        {confirmRemove ? (
          <Button
            type="button"
            variant="danger"
            className="ml-auto h-10 text-sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ memberId })}
          >
            {t("team.confirmRemove")}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="ml-auto text-[13px] font-semibold text-due"
          >
            {t("team.remove")}
          </button>
        )}
      </div>
    </div>
  );
}
