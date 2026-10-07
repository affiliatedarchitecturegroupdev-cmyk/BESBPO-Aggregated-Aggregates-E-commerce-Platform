import { ExtraLinePage, extraLineMetadata } from "@/components/lines/ExtraLinePage";

export const metadata = extraLineMetadata("testing");

export default function Page() {
  return <ExtraLinePage slug="testing" />;
}
