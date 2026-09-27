import { Quotes } from "@/components/admin/sections";

export const metadata = { title: "Quote requests" };

export default function QuotesPage({ searchParams }: { searchParams: { status?: string } }) {
  return <Quotes status={searchParams.status} />;
}
