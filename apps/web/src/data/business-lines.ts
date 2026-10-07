import { MEDIA_BY_ID } from "./media";

/** The platform's business lines, shown in the home-page carousel. Images come from data/media.ts. */
export type BusinessLine = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  href: string;
  cta: string;
  imageId: string;
};

export const BUSINESS_LINES: BusinessLine[] = [
  {
    id: "materials",
    title: "Aggregates & Materials",
    tagline: "Graded aggregates by the ton or m³",
    description: "Sub-base, crushed stone, sand, crusher run, drainage and recycled aggregate from our approved partner quarries.",
    href: "/products",
    cta: "Shop materials",
    imageId: "quarry-vehicle",
  },
  {
    id: "cement-ready-mix",
    title: "Cement & Ready-Mix Concrete",
    tagline: "Bagged cement and truck-load concrete",
    description: "Bagged cement from the leading SA brands and ready-mix by the m³, with concrete pumps quoted separately.",
    href: "/cement",
    cta: "See cement & ready-mix",
    imageId: "road-paving",
  },
  {
    id: "plant-hire",
    title: "Plant Hire",
    tagline: "Wet hire — machine, operator and fuel",
    description: "TLBs, excavators, tippers and rollers from vetted partners near your site. Tell us the job and we come back with availability and a written quote.",
    href: "/plant-hire",
    cta: "Hire a machine",
    imageId: "excavator-yellow",
  },
  {
    id: "haulage-services",
    title: "Haulage & Rubble Removal",
    tagline: "Tipper loads, skip bins and clean-ups",
    description: "Move material or clear rubble and spoil, with disposal at licensed sites.",
    href: "/services",
    cta: "Request a service",
    imageId: "tipper-truck-transit",
  },
  {
    id: "demolition-clearing",
    title: "Site Clearing & Demolition",
    tagline: "Quoted per job, done by vetted partners",
    description: "Clearing, strip-out and demolition by competent contractors, with the rubble recycled where the job allows.",
    href: "/services/demolition",
    cta: "Request a quote",
    imageId: "demolition-bulldozer",
  },
  {
    id: "job-packs",
    title: "Job Packs",
    tagline: "Materials, machines and trucks in one request",
    description: "Foundations, driveways, drainage and site platforms: one request, one written quote, one invoice.",
    href: "/job-packs",
    cta: "See the packs",
    imageId: "yellow-loader",
  },
];

export function lineImage(line: BusinessLine) {
  return MEDIA_BY_ID.get(line.imageId);
}
