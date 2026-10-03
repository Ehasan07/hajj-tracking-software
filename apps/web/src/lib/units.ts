import type { ShopUnit } from "@hajj/core";

/** Colour and tint for each shop, from the design tokens. Icons live with the components. */
export const UNIT_THEME: Record<ShopUnit, { color: string; tint: string; dot: string }> = {
  medicine: {
    color: "var(--color-unit-medicine)",
    tint: "var(--color-unit-medicine-tint)",
    dot: "bg-unit-medicine",
  },
  zamzam: {
    color: "var(--color-unit-zamzam)",
    tint: "var(--color-unit-zamzam-tint)",
    dot: "bg-unit-zamzam",
  },
  coffee: {
    color: "var(--color-unit-coffee)",
    tint: "var(--color-unit-coffee-tint)",
    dot: "bg-unit-coffee",
  },
  supernova: {
    color: "var(--color-unit-supernova)",
    tint: "var(--color-unit-supernova-tint)",
    dot: "bg-unit-supernova",
  },
};

export const SHOP_ORDER: ShopUnit[] = ["zamzam", "medicine", "coffee", "supernova"];

export function isShopUnit(value: string): value is ShopUnit {
  return (SHOP_ORDER as string[]).includes(value);
}

/** Roles that may see the agency's books (statements, payroll, expenses). */
export const BOOK_ROLES = ["owner", "admin", "accountant"];
export const MANAGER_ROLES = ["owner", "admin"];
