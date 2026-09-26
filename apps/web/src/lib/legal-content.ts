import fs from "node:fs";
import path from "node:path";

/**
 * Reads a legal page's source Markdown from content/legal/ — the single
 * source of truth referenced in AGENTIC_RULES.md rule 5. Rendered via
 * react-markdown in each legal page component.
 */
export function readLegalContent(filename: string): string {
  const filePath = path.join(process.cwd(), "..", "..", "content", "legal", filename);
  return fs.readFileSync(filePath, "utf-8");
}
