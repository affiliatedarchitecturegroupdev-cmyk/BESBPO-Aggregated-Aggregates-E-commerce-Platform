import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LegalPageLayout } from "./LegalPageLayout";
import { PolicyDates } from "./PolicyDates";
import { policyVersions, readLegalContent } from "@/lib/legal-content";

const text = (node: ReactNode): string =>
  Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? text(c.props.children) : ""))
    .join("");

/** Section headings get an id from their text without the number ("## 7. AA 60/120 express delivery" → #aa-60-120-express-delivery), so pages can link to a section. */
const slug = (heading: string) =>
  heading
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 id={slug(text(children))} className="scroll-mt-24">
      {children}
    </h2>
  ),
};

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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {body}
      </ReactMarkdown>
    </LegalPageLayout>
  );
}
