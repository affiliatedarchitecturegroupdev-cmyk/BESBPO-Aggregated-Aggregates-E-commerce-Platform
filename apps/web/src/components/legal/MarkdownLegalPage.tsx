import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LegalPageLayout } from "./LegalPageLayout";
import { readLegalContent } from "@/lib/legal-content";

export function MarkdownLegalPage({ filename }: { filename: string }) {
  const content = readLegalContent(filename);
  return (
    <LegalPageLayout>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </LegalPageLayout>
  );
}
