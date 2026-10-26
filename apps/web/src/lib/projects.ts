/** Design-and-build projects (docs/projects.md): what the API returns, and the labels. */
export type RoofBrief = { shape: "GABLE" | "HIP" | "MONO"; lengthM: number; widthM: number; pitchDeg: number; covering: "CONCRETE_TILE" | "IBR" | "CORRUGATED" | "CONCEALED_FIX"; overhangM: number; insulation: boolean };
export type SteelBrief = {
  use: "WAREHOUSE" | "WORKSHOP" | "CARPORT" | "CANOPY";
  roof: "DUO" | "MONO";
  lengthM: number;
  spanM: number;
  eavesHeightM: number;
  pitchDeg: number;
  sheeting: "IBR" | "CORRUGATED" | "CONCEALED_FIX";
  enclosed: boolean;
  rollerDoors: number;
  insulation: boolean;
  floorSlab: boolean;
};
export type ProjectPackage = "ROOF" | "STEEL_STRUCTURE";
export type TakeoffLine = { key: string; kind?: "FABRICATION" | "MATERIALS"; label: string; quantity: number; unit: string; note?: string; shopHref?: string };
export type TakeoffFigure = { label: string; value: number; unit: string };
/** Every package's take-off: the summary figures, the items (quantities only) and any warnings. */
export type Takeoff = { figures: TakeoffFigure[]; lines: TakeoffLine[]; warnings: string[] };
export type Estimate = { package: ProjectPackage; label: string; summary: string; brief: RoofBrief | SteelBrief; takeoff: Takeoff };

export type ProjectStatus = "BRIEF" | "DESIGN" | "QUOTING" | "PROPOSED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type LineKind = "DESIGN" | "MATERIALS" | "FABRICATION" | "INSTALLATION" | "OTHER";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  BRIEF: "Brief received",
  DESIGN: "Being designed",
  QUOTING: "Getting partners' quotes",
  PROPOSED: "Proposal sent",
  ACCEPTED: "Accepted — first payment due",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
export const LINE_KIND_LABEL: Record<LineKind, string> = { DESIGN: "Design and engineering", MATERIALS: "Materials", FABRICATION: "Fabrication", INSTALLATION: "Installation", OTHER: "Other" };

export type ClientProject = {
  id: string;
  reference: string;
  packageLabel: string;
  summary: string;
  status: ProjectStatus;
  province: string;
  siteAddress: string | null;
  contactName: string;
  takeoff: Takeoff;
  createdAt: string;
  proposal: {
    message: string | null;
    sentAt: string | null;
    validUntil: string | null;
    total: string | null;
    lines: { kind: LineKind; description: string; quantity: string; unit: string | null; unitPrice: string; total: number }[];
    milestones: { sequence: number; label: string; percent: string; amount: string; status: "DUE" | "PAID"; paidAt: string | null }[];
    acceptedAt: string | null;
    acceptedName: string | null;
  } | null;
};

export type StaffProject = {
  id: string;
  reference: string;
  package: ProjectPackage;
  packageLabel: string;
  summary: string;
  status: ProjectStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  siteAddress: string | null;
  province: string;
  brief: Record<string, unknown>;
  takeoff: Takeoff;
  clientNotes: string | null;
  staffNotes: string | null;
  proposalMessage: string | null;
  proposalSentAt: string | null;
  proposalValidUntil: string | null;
  acceptedAt: string | null;
  acceptedName: string | null;
  total: string | null;
  createdAt: string;
  lines: { id: string; kind: LineKind; description: string; quantity: string; unit: string | null; unitPrice: string; unitCost: string | null; partnerName: string | null; total: number }[];
  milestones: { id: string; sequence: number; label: string; percent: string; amount: string; status: "DUE" | "PAID"; paidAt: string | null; paymentReference: string | null }[];
  totals: { total: number; cost: number | null; margin: number | null; marginPercent: number | null; allCosted: boolean };
  defaultMilestones: { label: string; percent: number }[];
  /** The proposal editor's starting point from the take-off. */
  suggestedLines: { kind: LineKind; description: string; quantity: number; unit: string | null }[];
};

export const SHAPES: { value: RoofBrief["shape"]; label: string }[] = [
  { value: "GABLE", label: "Gable — two slopes" },
  { value: "HIP", label: "Hip — four slopes" },
  { value: "MONO", label: "Mono-pitch — one slope (lean-to)" },
];
export const COVERINGS: { value: RoofBrief["covering"]; label: string; pitch: number }[] = [
  { value: "CONCRETE_TILE", label: "Concrete roof tiles", pitch: 26 },
  { value: "IBR", label: "IBR sheeting", pitch: 10 },
  { value: "CORRUGATED", label: "Corrugated sheeting", pitch: 15 },
  { value: "CONCEALED_FIX", label: "Concealed-fix (Klip-Lok type) sheeting", pitch: 5 },
];

export const STEEL_USES: { value: SteelBrief["use"]; label: string; enclosed: boolean }[] = [
  { value: "WAREHOUSE", label: "Warehouse", enclosed: true },
  { value: "WORKSHOP", label: "Workshop", enclosed: true },
  { value: "CARPORT", label: "Carport or shade structure", enclosed: false },
  { value: "CANOPY", label: "Canopy", enclosed: false },
];
export const STEEL_SHEETS: { value: SteelBrief["sheeting"]; label: string }[] = [
  { value: "IBR", label: "IBR sheeting" },
  { value: "CORRUGATED", label: "Corrugated sheeting" },
  { value: "CONCEALED_FIX", label: "Concealed-fix (Klip-Lok type) sheeting" },
];
