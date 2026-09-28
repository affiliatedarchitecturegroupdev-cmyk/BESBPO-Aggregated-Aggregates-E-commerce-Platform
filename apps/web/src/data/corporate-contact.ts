// Besbpo Group's real, confirmed corporate contact infrastructure — shared
// across every division's site, not AA-specific (same pattern as
// social.ts's Group-level handles). Sourced from the Group's own CIPC
// registration and confirmed telephony setup, not invented.
export type PhoneLine = {
  label: string;
  number: string; // display format
  tel: string; // tel: href format, E.164-ish for SA numbers
  status: "live" | "rica-pending";
};

export const PHONE_LINES: PhoneLine[] = [
  { label: "General Enquiries", number: "087 265 2505", tel: "+27872652505", status: "live" },
  { label: "Johannesburg", number: "010 016 6071", tel: "+27100166071", status: "rica-pending" },
  { label: "Cape Town", number: "021 061 3355", tel: "+27210613355", status: "rica-pending" },
  { label: "Durban", number: "031 024 5520", tel: "+27310245520", status: "rica-pending" },
];

export const REGISTERED_ADDRESS = {
  line1: "2 Ncondo Place",
  line2: "Ridgeside Dr, Umhlanga Ridge",
  city: "Durban",
  province: "KwaZulu-Natal",
  postalCode: "4319",
  country: "South Africa",
};

export const CORPORATE_EMAILS = {
  sales: "sales@aggregates.store",
  partners: "partners@besbpo.co.za",
};

export function formatAddress(): string {
  return `${REGISTERED_ADDRESS.line1}, ${REGISTERED_ADDRESS.line2}, ${REGISTERED_ADDRESS.city}, ${REGISTERED_ADDRESS.province}, ${REGISTERED_ADDRESS.postalCode}`;
}
