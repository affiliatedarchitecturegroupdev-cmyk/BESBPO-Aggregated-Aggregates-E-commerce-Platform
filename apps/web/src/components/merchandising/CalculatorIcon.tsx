import { BrickWall, Calculator, Droplets, Grid2x2, Mountain, Truck, Weight, type LucideIcon } from "lucide-react";
import type { CalculatorIcon as IconKey } from "@/data/calculators";

const ICONS: Record<IconKey, LucideIcon> = {
  tonnage: Mountain,
  readyMix: Truck,
  wall: BrickWall,
  paving: Grid2x2,
  drain: Droplets,
  steel: Weight,
  estimator: Calculator,
};

export function CalculatorIcon({ icon, className }: { icon: IconKey; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
