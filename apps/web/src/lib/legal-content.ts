import fs from "node:fs";
import path from "node:path";

const LEGAL_DIR = path.join(process.cwd(), "..", "..", "content", "legal");

/**
 * Reads a legal page's source Markdown from content/legal/ — the single
 * source of truth referenced in AGENTIC_RULES.md rule 5. Rendered via
 * react-markdown in each legal page component.
 */
export function readLegalContent(filename: string): string {
  return fs.readFileSync(path.join(LEGAL_DIR, filename), "utf-8");
}

export type PolicyVersion = { date: string; changes: string };

/**
 * A legal page's version history, newest first, from
 * content/legal/policy-versions.json (content/legal/README.md, "Policy
 * versions"). Every published page must have one: a page without it fails
 * the build rather than going out undated.
 */
export function policyVersions(filename: string): PolicyVersion[] {
  const registry = JSON.parse(fs.readFileSync(path.join(LEGAL_DIR, "policy-versions.json"), "utf-8")) as { policies: Record<string, PolicyVersion[]> };
  const versions = registry.policies[filename];
  if (!versions?.length) throw new Error(`content/legal/policy-versions.json has no versions for ${filename}`);
  for (let i = 0; i < versions.length; i++) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(versions[i].date)) throw new Error(`Bad date "${versions[i].date}" for ${filename}`);
    if (i > 0 && versions[i].date >= versions[i - 1].date) throw new Error(`${filename}: versions must be newest first, one per date`);
  }
  return versions;
}

/** "2026-10-11" → "11 October 2026", the way the pages have always written dates. */
export function policyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1];
  return `${d} ${month} ${y}`;
}
