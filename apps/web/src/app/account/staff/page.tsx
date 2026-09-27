import { redirect } from "next/navigation";

/** The staff console moved to /admin; keep old links working. */
export default function StaffConsoleRedirect({ searchParams }: { searchParams: { view?: string } }) {
  const section = { quotes: "quotes", documents: "documents", applications: "applications" }[searchParams.view ?? ""];
  redirect(section ? `/admin/${section}` : "/admin");
}
