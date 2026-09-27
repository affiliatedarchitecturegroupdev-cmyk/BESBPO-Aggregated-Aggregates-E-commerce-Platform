import "server-only";

/**
 * Server-side client for the NestJS API. The browser never calls the API
 * directly: pages and server actions call it over Render's private network
 * (API_URL is the API's internal host:port in render.yaml), passing the
 * session token from our own httpOnly cookie.
 */
const API_BASE = (() => {
  const url = process.env.API_URL ?? "http://localhost:4000";
  const withScheme = /^https?:\/\//.test(url) ? url : `http://${url}`;
  return `${withScheme.replace(/\/+$/, "")}/api/v1`;
})();

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

export async function api<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, message: "Our systems are unavailable right now — please try again shortly." };
  }
  const text = await response.text();
  const json = text ? safeJson(text) : null;
  if (response.ok) {
    return { ok: true, data: json as T };
  }
  return { ok: false, status: response.status, message: errorMessage(json) };
}

/**
 * Cached public read for storefront pages (CMS content, merchandising).
 * Returns null when the API can't be reached — e.g. during the Render build,
 * which has no private network — so pages fall back to built-in content and
 * pick up the live data when they revalidate.
 */
export async function apiCached<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: revalidateSeconds, tags: ["cms"] },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Sends multipart form data (file uploads) to the API. */
export async function apiUpload<T>(path: string, form: FormData, token: string | null): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, message: "Our systems are unavailable right now — please try again shortly." };
  }
  const text = await response.text();
  const json = text ? safeJson(text) : null;
  return response.ok ? { ok: true, data: json as T } : { ok: false, status: response.status, message: errorMessage(json) };
}

/** Raw API response, for streaming files back to the browser. */
export function apiRaw(path: string, token: string | null) {
  return fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Nest validation errors arrive as { message: string | string[] }; the pricing service uses { detail }. */
function errorMessage(json: unknown): string {
  if (json && typeof json === "object") {
    const { message, detail } = json as { message?: unknown; detail?: unknown };
    const text = message ?? detail;
    if (Array.isArray(text)) return text.join(". ");
    if (typeof text === "string") return text;
  }
  return "Something went wrong — please try again.";
}
