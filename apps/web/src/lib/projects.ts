/** Design-and-build projects (docs/projects.md): what the API returns, and the labels. */
export type RoofBrief = { shape: "GABLE" | "HIP" | "MONO"; lengthM: number; widthM: number; pitchDeg: number; covering: "CONCRETE_TILE" | "IBR" | "CORRUGATED" | "CONCEALED_FIX"; overhangM: number; insulation: boolean };
export type TakeoffLine = { key: string; label: string; quantity: number; unit: string; note?: string; shopHref?: string };
export type Takeoff = { planAreaM2: number; roofAreaM2: number; rafterLengthM: number; trusses: number; trussCentresM: number; lines: TakeoffLine[]; warnings: string[] };
export type Estimate = { package: "ROOF"; label: string; summary: string; brief: RoofBrief; takeoff: Takeoff };

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
  package: "ROOF";
  packageLabel: string;
  summary: string;
  status: ProjectStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  siteAddress: string | null;
  province: string;
  brief: RoofBrief;
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
