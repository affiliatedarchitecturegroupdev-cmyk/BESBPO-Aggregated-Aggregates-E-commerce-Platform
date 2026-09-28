/**
 * Illustrative case studies — how Trade and Volume/Civil Bulk accounts use
 * the platform. These are NOT real client projects and the page labels
 * every one as illustrative. Replace them with named, approved client
 * projects as they complete.
 */
export type CaseStudy = {
  slug: string;
  title: string;
  industry: string;
  summary: string;
  stats: { label: string; value: string }[];
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "gauteng-logistics-precinct-earthworks",
    title: "Bulk Sub-Base Supply for a Gauteng Logistics Precinct",
    industry: "Industrial, Logistics Precinct & Earthworks",
    summary:
      "A phased industrial park needs consistent G4 sub-base across a long build programme, with Volume/Civil Bulk pricing and PO invoicing matched to the contractor's procurement cycle.",
    stats: [
      { label: "Material", value: "G4 sub-base" },
      { label: "Pricing tier", value: "Volume / Civil Bulk" },
      { label: "Billing", value: "Purchase order" },
    ],
  },
  {
    slug: "kzn-ready-mix-batching-plant",
    title: "Daily Aggregate & Sand Intake for a KZN Ready-Mix Plant",
    industry: "Ready-Mix & Precast Concrete Manufacturers",
    summary:
      "A batching operation consolidates 19mm stone and washed river sand under one broker relationship, keeping delivered pricing transparent and ton/m³ figures consistent batch to batch.",
    stats: [
      { label: "Materials", value: "19mm stone, river sand" },
      { label: "Delivery", value: "Daily" },
      { label: "Pricing tier", value: "Contractor / Trade" },
    ],
  },
];
