import "server-only";
import { apiCached } from "./api";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "INTERNSHIP" | "LEARNERSHIP";
export type WorkplaceType = "ON_SITE" | "HYBRID" | "REMOTE";
export type VacancyStatus = "DRAFT" | "OPEN" | "CLOSED";
export type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "INTERVIEW" | "OFFER" | "HIRED" | "UNSUCCESSFUL" | "WITHDRAWN";

export type Vacancy = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  workplace: WorkplaceType;
  summary: string;
  description: string;
  salary: string | null;
  closingDate: string | null;
  publishedAt: string | null;
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
  INTERNSHIP: "Internship",
  LEARNERSHIP: "Learnership",
};

export const WORKPLACE_LABELS: Record<WorkplaceType, string> = { ON_SITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" };

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer made",
  HIRED: "Hired",
  UNSUCCESSFUL: "Unsuccessful",
  WITHDRAWN: "Withdrawn",
};

/** The teams we recruit for — used for the "teams" section and as department suggestions in the admin. */
export const DEPARTMENTS = [
  { name: "Sales & Trade Accounts", blurb: "Quoting, account management and growing our contractor and civil customers." },
  { name: "Logistics & Dispatch", blurb: "Planning tipper deliveries, routing loads and keeping sites supplied on time." },
  { name: "Supplier Partnerships", blurb: "Onboarding quarries and plants, and keeping our partner network sharp." },
  { name: "Customer Support", blurb: "Helping buyers by phone, WhatsApp and email — from first question to delivery." },
  { name: "Finance & Administration", blurb: "Invoicing, credit control, payments and compliance." },
  { name: "Digital & Technology", blurb: "The store, data, digital marketing and the systems behind them." },
] as const;

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export async function getOpenVacancies(): Promise<Vacancy[]> {
  return (await apiCached<Vacancy[]>("/careers/vacancies", 60)) ?? [];
}

export async function getVacancy(slug: string): Promise<Vacancy | null> {
  return apiCached<Vacancy>(`/careers/vacancies/${encodeURIComponent(slug)}`, 60);
}

export function formatClosing(date: string | null) {
  if (!date) return "Open until filled";
  return `Closes ${new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}`;
}
