import { Applications } from "@/components/admin/sections";

export const metadata = { title: "Trade applications" };

export default function ApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  return <Applications status={searchParams.status} />;
}
