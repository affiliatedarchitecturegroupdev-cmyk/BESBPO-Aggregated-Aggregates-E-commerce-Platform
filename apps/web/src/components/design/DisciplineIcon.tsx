import { Building2, ClipboardList, PencilRuler, ShieldCheck, Waves, type LucideIcon } from "lucide-react";
import type { Discipline } from "@/data/design-services";

export const DISCIPLINE_ICON: Record<Discipline, LucideIcon> = {
  architectural: PencilRuler,
  structural: Building2,
  civil: Waves,
  compliance: ShieldCheck,
  quantities: ClipboardList,
};
