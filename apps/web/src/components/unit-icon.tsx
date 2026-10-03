import type { ShopUnit } from "@hajj/core";
import { DallahIcon, MedicineIcon, SupernovaIcon, ZamzamIcon } from "./icons";

const ICONS = {
  medicine: MedicineIcon,
  zamzam: ZamzamIcon,
  coffee: DallahIcon,
  supernova: SupernovaIcon,
} as const;

export function UnitIcon({
  unit,
  size = 24,
  tint,
}: {
  unit: ShopUnit;
  size?: number;
  tint?: string;
}) {
  const Icon = ICONS[unit];
  return <Icon size={size} tint={tint} />;
}
