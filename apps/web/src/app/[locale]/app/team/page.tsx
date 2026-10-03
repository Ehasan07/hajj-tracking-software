import { getTranslations, setRequestLocale } from "next-intl/server";
import { SHOP_UNITS, type ShopUnit } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui";
import { dateText, digits, initials, type Locale } from "@/lib/format";
import { MANAGER_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { CreateLoginForm, MemberActions, UnitsForm } from "./team-forms";

export default async function TeamPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const me = await caller.tenant.me();
  if (!MANAGER_ROLES.includes(me.role)) return <NoAccess />;
  const [members, access, subscription] = await Promise.all([
    caller.team.members(),
    caller.shop.access(),
    caller.tenant.subscription(),
  ]);
  const shops = SHOP_UNITS.filter(
    (u) => access.enabled.includes(u) && access.inPlan.includes(u),
  ) as ShopUnit[];
  const isOwner = me.role === "owner";
  const seats = subscription?.limits.staffSeats ?? null;

  return (
    <PageBody>
      <PageHeader title={t("nav.team")} subtitle={t("team.subtitle")} />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">{t("team.businesses")}</h2>
          <p className="text-[14px] text-ink-3">{t("team.businessesHint")}</p>
        </div>
        <UnitsForm enabled={access.enabled} inPlan={access.inPlan} />
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
            <h2 className="text-lg font-bold">{t("team.members")}</h2>
            <span className="text-[13px] text-ink-3">
              {digits(members.length, locale)}
              {seats !== null ? ` / ${digits(seats, locale)}` : ""}
            </span>
          </div>
          <ul>
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start gap-3 border-t border-[#eef3f2] px-6 py-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-haram-tint font-bold text-haram-deep">
                  {initials(m.name)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate">
                    {m.name}{" "}
                    {m.self ? (
                      <span className="text-[12px] font-normal text-ink-3">({t("team.you")})</span>
                    ) : null}
                  </b>
                  <span className="truncate text-[13px] text-ink-3">{m.email}</span>
                  {m.role === "shop_operator" && m.units.length ? (
                    <span className="text-[13px] text-ink-2">
                      {m.units.map((u) => t(`units.${u}`)).join(", ")}
                    </span>
                  ) : null}
                  <span className="text-[12px] text-ink-3">{dateText(m.createdAt, locale)}</span>
                </span>
                <span className="flex flex-col items-end gap-2">
                  <Badge
                    tone={
                      m.role === "owner" ? "paid" : m.role === "shop_operator" ? "info" : "neutral"
                    }
                  >
                    {t.has(`roles.${m.role}`) ? t(`roles.${m.role}`) : m.role}
                  </Badge>
                  {!m.self ? (
                    <MemberActions
                      memberId={m.id}
                      role={m.role}
                      units={m.units.filter((u): u is ShopUnit =>
                        (SHOP_UNITS as readonly string[]).includes(u),
                      )}
                      shops={shops}
                      isOwner={isOwner}
                    />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">{t("team.newLogin")}</h2>
            <p className="text-[14px] text-ink-3">{t("team.newLoginHint")}</p>
          </div>
          <CreateLoginForm shops={shops} isOwner={isOwner} />
        </Card>
      </div>
    </PageBody>
  );
}
