import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LegalPageLayout } from "./LegalPageLayout";
import { PolicyDates } from "./PolicyDates";
import { policyVersions, readLegalContent } from "@/lib/legal-content";

/** A legal page: its title, the dates from its version history, then the body. */
export function MarkdownLegalPage({ filename }: { filename: string }) {
  const content = readLegalContent(filename);
  const versions = policyVersions(filename);
  const split = content.indexOf("\n");
  const [title, body] = content.startsWith("# ") ? [content.slice(0, split), content.slice(split + 1)] : ["", content];
  return (
    <LegalPageLayout>
      {title && <ReactMarkdown remarkPlugins={[remarkGfm]}>{title}</ReactMarkdown>}
      <PolicyDates versions={versions} />
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </LegalPageLayout>
  );
}
