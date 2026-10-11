import { EnquiryForm, type DetailField } from "@/components/enquiries/EnquiryForm";
import { DESIGN_SERVICES, type DesignService } from "@/data/design-services";

const PROJECT_TYPES = ["New house", "Addition or alteration", "Commercial or industrial building", "Development or estate", "Existing building — no new work"];
const HAVE = ["Nothing yet", "Sketches or ideas", "Existing plans of the building", "Approved plans", "An engineer's or other report"];
const START = ["As soon as possible", "Within 3 months", "3–6 months", "6–12 months", "Not sure yet"];

/**
 * A BAE design brief, logged as a DESIGN enquiry (DESIGN_SERVICES.md). On a
 * service page the service is fixed; on /design the customer picks one. The
 * fee estimator passes the floor area and building cost through.
 */
export function DesignBriefForm({ service, area, cost }: { service?: DesignService; area?: string; cost?: string }) {
  const fields: DetailField[] = [
    ...(service
      ? []
      : [
          {
            name: "Service",
            label: "What do you need?",
            type: "select" as const,
            options: [...DESIGN_SERVICES.map((s) => s.name), "Not sure — advise me"],
            required: true,
            wide: true,
          },
        ]),
    { name: "Project type", label: "Project", type: "select", options: PROJECT_TYPES, required: true },
    { name: "Floor area m2", label: "Floor area (m², roughly)", type: "number", min: 1, defaultValue: area },
    { name: "Building cost estimate", label: "Building budget (R, if known)", type: "number", min: 0, defaultValue: cost },
    { name: "Erf number", label: "Erf / stand number", placeholder: "Helps us check zoning and servitudes" },
    { name: "Already have", label: "What do you have already?", type: "select", options: HAVE },
    { name: "Start building", label: "When do you want to build?", type: "select", options: START },
    {
      name: "Brief",
      label: "Describe the project",
      type: "textarea",
      required: true,
      placeholder: "e.g. 3-bed single-storey house on a sloping 600 m² stand, double garage, IBR roof…",
    },
  ];
  return (
    <EnquiryForm
      kind="DESIGN"
      subject={service ? `Design: ${service.name}` : "Design brief"}
      sku={service ? `BAE-${service.slug}` : undefined}
      fields={fields}
      messageLabel="Anything else? (optional)"
      submitLabel="Send the brief"
    />
  );
}
