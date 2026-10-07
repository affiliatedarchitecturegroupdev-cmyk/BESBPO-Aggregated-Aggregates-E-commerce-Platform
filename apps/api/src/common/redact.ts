/**
 * Keeps customers and partners talking through the platform: strips phone
 * numbers, email addresses, links, WhatsApp invites and social handles from
 * chat messages and job-card notes. Each hit is reported so staff can review
 * it (CircumventionFlag) — a review queue, never an automatic penalty.
 */
export type RedactionResult = { text: string; hits: string[] };

export const REDACTION_MASK = "[contact details removed]";

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "email", re: /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Z0-9-]+)*\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Z]{2,}\b/gi },
  { label: "whatsapp", re: /\b(?:https?:\/\/)?(?:wa\.me|chat\.whatsapp\.com|api\.whatsapp\.com)\S*/gi },
  { label: "link", re: /\b(?:https?:\/\/|www\.)\S+/gi },
  // A phone number: 9–12 digits, optionally +27/0-prefixed, with spaces, dots, dashes or brackets between.
  { label: "phone", re: /(?<![\w])(?:\+|00)?\d(?:[\s().-]{0,2}\d){8,11}(?![\w])/g },
  { label: "handle", re: /(?<![\w@])@[A-Z0-9_][A-Z0-9_.]{2,}/gi },
];

export function redactContactDetails(input: string): RedactionResult {
  let text = input;
  const hits: string[] = [];
  for (const { label, re } of PATTERNS) {
    text = text.replace(re, () => {
      hits.push(label);
      return REDACTION_MASK;
    });
  }
  return { text, hits };
}
