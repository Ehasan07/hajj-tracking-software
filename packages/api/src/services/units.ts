import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { SHOP_UNITS, type BusinessUnit, type ShopUnit } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { memberUnits, plans, subscriptions } from "@hajj/db/schema";
import type { Role } from "../trpc";
import { getSettings } from "./tenant";

export interface UnitAccess {
  /** Turned on by the agency. */
  enabled: BusinessUnit[];
  /** Part of the agency's plan (all units when there is no subscription row, e.g. tests). */
  inPlan: BusinessUnit[];
  /** Shops this login may open. */
  shops: ShopUnit[];
}

export async function unitAccess(tx: Transaction, role: Role, userId: string): Promise<UnitAccess> {
  const settings = await getSettings(tx);
  const [plan] = await tx
    .select({ units: plans.units })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .limit(1);
  const inPlan = plan ? plan.units : [...settings.enabledUnits, ...SHOP_UNITS];
  const open = SHOP_UNITS.filter((u) => settings.enabledUnits.includes(u) && inPlan.includes(u));

  let shops: ShopUnit[] = open;
  if (role === "shop_operator") {
    const [row] = await tx
      .select({ units: memberUnits.units })
      .from(memberUnits)
      .where(eq(memberUnits.userId, userId))
      .limit(1);
    shops = open.filter((u) => row?.units.includes(u));
  } else if (role === "alim") {
    shops = [];
  }
  return { enabled: settings.enabledUnits, inPlan, shops };
}

/** Throws unless this login may work in the shop. */
export async function assertShop(tx: Transaction, role: Role, userId: string, unit: ShopUnit) {
  const access = await unitAccess(tx, role, userId);
  if (!access.enabled.includes(unit))
    throw new TRPCError({ code: "FORBIDDEN", message: "UNIT_DISABLED" });
  if (!access.inPlan.includes(unit))
    throw new TRPCError({ code: "FORBIDDEN", message: "UNIT_NOT_IN_PLAN" });
  if (!access.shops.includes(unit)) throw new TRPCError({ code: "FORBIDDEN" });
}
