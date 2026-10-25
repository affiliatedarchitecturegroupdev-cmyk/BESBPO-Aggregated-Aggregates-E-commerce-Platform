/** Admin → Catalogue import (docs/catalogue-import.md): what the API returns for an import and its rows. */
export type ImportRowStatus = "NEW" | "EXISTS" | "PROBLEM";

export type ImportRow = {
  rowNumber: number;
  name: string;
  category: string;
  categorySlug: string | null;
  categoryName: string | null;
  units: string[];
  unitLabels: string[];
  sku: string | null;
  slug: string | null;
  brand: string | null;
  standard: string | null;
  size: string | null;
  description: string | null;
  supplierCode: string | null;
  cost: number | null;
  status: ImportRowStatus;
  existingSku: string | null;
  problem: string | null;
};

export type CatalogueImport = {
  id: string;
  status: "PREVIEW" | "APPLIED" | "DISCARDED";
  fileName: string;
  supplierLocationId: string | null;
  supplierName: string | null;
  validUntil: string | null;
  createdAt: string;
  appliedAt: string | null;
  priceListId: string | null;
  counts: { NEW: number; EXISTS: number; PROBLEM: number; withCost: number };
  rows: ImportRow[];
};

export const ROW_STATUS_LABEL: Record<ImportRowStatus, string> = { NEW: "New product", EXISTS: "Already a product", PROBLEM: "Can't add" };
export const IMPORT_STATUS_LABEL: Record<CatalogueImport["status"], string> = { PREVIEW: "Preview — nothing added yet", APPLIED: "Added", DISCARDED: "Discarded" };
