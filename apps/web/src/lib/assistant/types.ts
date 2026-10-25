/**
 * The shopping assistant's contract (SHOPPING_ASSISTANT.md). The widget sends
 * a message with the page it's on and the cart; an engine answers with text,
 * product cards, links and follow-up suggestions. The rules engine is the
 * default; any other engine (a self-hosted open model, say) implements the
 * same interface and is chosen with ASSISTANT_ENGINE.
 */
export type AssistantCartLine = { sku: string; unit: string; quantity: number };

export type AssistantContext = {
  /** The page the customer is on, e.g. "/products/river-sand-washed". */
  path: string;
  /** The product on that page, resolved by the server from the path. */
  sku: string | null;
  cart: AssistantCartLine[];
  /** Products staff have hidden — never shown or suggested. */
  hiddenSkus: string[];
  /** Whether VAT is shown (docs/vat.md); fees say "excl. VAT" only when it is. */
  vatRegistered?: boolean;
};

/** Carried between turns by the widget so a follow-up ("6 by 4") answers the last question. */
export type AssistantState = {
  /** A calculation waiting for its sizes. */
  pending?: "volume" | "wall" | "paving" | "rebar";
  /** The product the conversation is about. */
  sku?: string;
  /** A volume already worked out, waiting for the material to convert it to tons. */
  volumeM3?: number;
};

export type AssistantCard = {
  sku: string;
  name: string;
  href: string;
  /** "R358.40 / ton" — or null when the product is priced on request. */
  price: string | null;
  /** Why it's suggested, when there's a reason to give. */
  note?: string;
  /** What "Add to cart" adds — only when the unit has a list price. */
  add?: { unit: string; quantity: number; label: string };
  /** Quote link for products priced on request. */
  quoteHref?: string;
};

export type AssistantLink = { label: string; href: string };

export type AssistantReply = {
  intent: string;
  text: string;
  cards?: AssistantCard[];
  links?: AssistantLink[];
  suggestions?: string[];
  state?: AssistantState;
};

export interface AssistantEngine {
  name: string;
  respond(message: string, context: AssistantContext, state: AssistantState): Promise<AssistantReply>;
}
