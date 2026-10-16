import { Injectable, Logger } from "@nestjs/common";

/**
 * Listmonk — the self-hosted newsletter and campaign tool (docs/email.md).
 * The platform stays the record of consent (POPIA): only subscribers who
 * confirmed by email are sent to Listmonk, already confirmed, and unsubscribes
 * flow both ways. Switched on by LISTMONK_URL, LISTMONK_API_USER,
 * LISTMONK_API_TOKEN and LISTMONK_LIST_IDS; until then nothing is sent and
 * sign-ups simply wait in the database.
 */
export type ListmonkSubscriber = {
  id: number;
  email: string;
  status: "enabled" | "disabled" | "blocklisted";
  lists: { id: number; subscription_status: "unconfirmed" | "confirmed" | "unsubscribed" }[];
};

export type ListmonkPush = { email: string; name: string | null; attribs: Record<string, string | null> };

const TIMEOUT_MS = 15_000;

export class ListmonkError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Listmonk's subscriber query is SQL: quote the address safely. */
export const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

@Injectable()
export class ListmonkClient {
  private readonly logger = new Logger(ListmonkClient.name);

  status() {
    const missing = ["LISTMONK_URL", "LISTMONK_API_USER", "LISTMONK_API_TOKEN", "LISTMONK_LIST_IDS"].filter((name) => !process.env[name]?.trim());
    const listIds = this.listIds();
    if (process.env.LISTMONK_LIST_IDS && listIds.length === 0) missing.push("LISTMONK_LIST_IDS (comma-separated list numbers)");
    return { live: missing.length === 0, missingEnvVars: missing, url: this.baseUrl(), listIds };
  }

  /** LISTMONK_URL, or Render's private "host:port" for the Listmonk service (render.yaml), which has no scheme. */
  private baseUrl(): string | null {
    const raw = process.env.LISTMONK_URL?.trim().replace(/\/+$/, "");
    if (!raw) return null;
    return /^https?:\/\//.test(raw) ? raw : `http://${raw}`;
  }

  listIds(): number[] {
    return (process.env.LISTMONK_LIST_IDS ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  /** Creates or updates a confirmed subscriber on our lists. Returns Listmonk's ID. */
  async upsert(subscriber: ListmonkPush, knownId: number | null): Promise<number> {
    const body = {
      email: subscriber.email,
      // Listmonk requires a name; the part before the @ stands in when we have none.
      name: subscriber.name?.trim() || subscriber.email.split("@")[0],
      status: "enabled",
      lists: this.listIds(),
      attribs: subscriber.attribs,
      // They already confirmed with us (double opt-in), so Listmonk mustn't ask again.
      preconfirm_subscriptions: true,
    };
    const id = knownId ?? (await this.findId(subscriber.email));
    if (id) {
      await this.request("PUT", `/api/subscribers/${id}`, body);
      return id;
    }
    const created = await this.request<{ data: { id: number } }>("POST", "/api/subscribers", body);
    return created.data.id;
  }

  /** Unsubscribed with us (or complained): Listmonk must never email them. */
  async blocklist(id: number) {
    await this.request("PUT", `/api/subscribers/${id}/blocklist`, {});
  }

  /** POPIA erasure. */
  async remove(id: number) {
    await this.request("DELETE", `/api/subscribers/${id}`).catch((error: ListmonkError) => {
      if (error.status !== 404) throw error;
    });
  }

  async findId(email: string): Promise<number | null> {
    const params = new URLSearchParams({ query: `subscribers.email = ${sqlString(email.toLowerCase())}`, per_page: "1" });
    const found = await this.request<{ data: { results: { id: number }[] } }>("GET", `/api/subscribers?${params}`);
    return found.data.results[0]?.id ?? null;
  }

  /** Everyone on our lists, a page at a time — for pulling unsubscribes made in Listmonk. */
  async *subscribers(): AsyncGenerator<ListmonkSubscriber> {
    for (const listId of this.listIds()) {
      for (let page = 1; page < 1000; page++) {
        const params = new URLSearchParams({ list_id: String(listId), page: String(page), per_page: "500" });
        const res = await this.request<{ data: { results: ListmonkSubscriber[]; total: number; per_page: number } }>("GET", `/api/subscribers?${params}`);
        for (const s of res.data.results) yield s;
        if (res.data.results.length < 500) break;
      }
    }
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const { url } = this.status();
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        // Listmonk v4+ API users: "token <user>:<token>".
        Authorization: `token ${process.env.LISTMONK_API_USER}:${process.env.LISTMONK_API_TOKEN}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: Error) => {
      throw new ListmonkError(`Listmonk unreachable: ${error.message}`);
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      this.logger.warn(`Listmonk ${method} ${path.split("?")[0]} → HTTP ${response.status}`);
      throw new ListmonkError(`Listmonk HTTP ${response.status}${detail ? `: ${detail}` : ""}`, response.status);
    }
    return (response.status === 204 ? {} : await response.json()) as T;
  }
}
