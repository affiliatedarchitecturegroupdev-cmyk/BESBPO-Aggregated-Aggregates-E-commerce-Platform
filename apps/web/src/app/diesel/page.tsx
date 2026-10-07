import { ExtraLinePage, extraLineMetadata } from "@/components/lines/ExtraLinePage";

export const metadata = extraLineMetadata("diesel");

export default function Page() {
  return <ExtraLinePage slug="diesel" />;
}
