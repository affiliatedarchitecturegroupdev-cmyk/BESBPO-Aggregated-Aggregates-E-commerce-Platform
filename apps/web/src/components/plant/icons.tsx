import { Construction, Droplets, Forklift, Grid3x3, Hammer, Layers, Recycle, Shovel, Tractor, Trash2, Truck, type LucideIcon } from "lucide-react";
import type { PlantClass, ServiceType } from "@/data/plant-services";

export const PLANT_ICON: Record<PlantClass, LucideIcon> = {
  TLB: Tractor,
  EXCAVATOR: Construction,
  TIPPER: Truck,
  ROLLER: Layers,
  SKID_STEER: Forklift,
  WHEEL_LOADER: Shovel,
  SITE_DUMPER: Truck,
  WATER_TRUCK: Droplets,
};

export const SERVICE_ICON: Record<ServiceType, LucideIcon> = {
  HAULAGE: Truck,
  RUBBLE_REMOVAL: Recycle,
  SKIP_BIN: Trash2,
  SITE_CLEARING: Shovel,
  DEMOLITION: Hammer,
  WASTE_MANAGEMENT: Recycle,
  STEEL_FIXING: Grid3x3,
};
