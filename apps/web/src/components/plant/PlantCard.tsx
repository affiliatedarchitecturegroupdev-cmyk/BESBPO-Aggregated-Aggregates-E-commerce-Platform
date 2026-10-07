import Link from "next/link";
import type { PlantItem, ServiceItem } from "@/data/plant-services";
import { SERVICE_UNIT_LABEL } from "@/data/plant-services";
import { PLANT_ICON, SERVICE_ICON } from "./icons";

const QUOTE_BADGE = "rounded-sm bg-ochre-gold/15 px-2 py-0.5 font-mono text-[10px] uppercase text-basalt";

export function PlantCard({ item }: { item: PlantItem }) {
  const Icon = PLANT_ICON[item.plantClass];
  return (
    <Link href={`/plant-hire/${item.slug}`} className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-limestone text-seam-blue">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className={QUOTE_BADGE}>Quote</span>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-basalt group-hover:text-seam-blue">{item.name}</h3>
      <p className="mt-1 font-mono text-[11px] text-slate">{item.sizeLabel} · wet hire</p>
      <p className="mt-3 flex-1 font-body text-sm text-slate">{item.typicalUses[0]}</p>
      <span className="mt-4 font-body text-sm font-semibold text-seam-blue">Request this machine →</span>
    </Link>
  );
}

export function ServiceCard({ item }: { item: ServiceItem }) {
  const Icon = SERVICE_ICON[item.serviceType];
  return (
    <Link href={`/services/${item.slug}`} className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-limestone text-seam-blue">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className={QUOTE_BADGE}>{item.unit === "QUOTE" ? "Always quoted" : `Quote · ${SERVICE_UNIT_LABEL[item.unit].toLowerCase()}`}</span>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-basalt group-hover:text-seam-blue">{item.name}</h3>
      <p className="mt-3 flex-1 font-body text-sm text-slate">{item.description}</p>
      <span className="mt-4 font-body text-sm font-semibold text-seam-blue">Request this service →</span>
    </Link>
  );
}
