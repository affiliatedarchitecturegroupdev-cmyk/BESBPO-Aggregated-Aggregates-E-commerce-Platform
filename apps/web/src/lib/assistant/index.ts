import "server-only";
import { rulesEngine } from "./rules-engine";
import type { AssistantEngine } from "./types";

/**
 * The engine behind the shopping assistant. Only the free rules engine exists
 * today; another engine (for example a self-hosted open model) plugs in here
 * behind ASSISTANT_ENGINE without changing the widget or the API route.
 */
const ENGINES: Record<string, AssistantEngine> = { rules: rulesEngine };

export function assistantEngine(): AssistantEngine {
  return ENGINES[process.env.ASSISTANT_ENGINE ?? "rules"] ?? rulesEngine;
}

export type * from "./types";
