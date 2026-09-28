import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders staff-written Markdown. Raw HTML is not rendered (react-markdown's
 * default) and unsafe link protocols are stripped, so a post can't inject
 * script.
 */
export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="font-body text-base leading-relaxed text-basalt [&_a]:text-seam-blue [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:font-semibold [&_table]:mt-4 [&_td]:border [&_td]:border-basalt/10 [&_td]:px-2 [&_th]:border [&_th]:border-basalt/10 [&_th]:px-2 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
