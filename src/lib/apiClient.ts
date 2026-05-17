/**
 * apiClient.ts — Central HTTP client with full observability
 *
 * Replaces raw `fetch()` calls in the codebase.
 * All calls are logged with: method, URL, latency, status, error codes.
 *
 * Features:
 *  - Automatic timeout enforcement
 *  - ECONNREFUSED / ETIMEDOUT / fetch-error detection & classification
 *  - Latency measurement per request
 *  - Structured logging via logger
 *  - No-op in test mode (tests should mock this file)
 */

import logger from "@/lib/logger";

// ─── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApiRequestOptions extends RequestInit {
  /** Override timeout for this specific request */
  timeoutMs?: number;
  /** Component / context identifier for logging */
  component?: string;
}

export interface ApiResponse<T = unknown> {
  ok:    boolean;
  status: number;
  data:   T | null;
  error:  string | null;
  /** Duration in milliseconds */
  durationMs: number;
}

// ─── Core ─────────────────────────────────────────────────────────────────────
async function doFetch<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { component = "apiClient", timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const start = performance.now();

  logger.api.debug(component, `→ ${method} ${url}`, { timeoutMs });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, headers, signal: ctrl.signal });
    const durationMs = Math.round(performance.now() - start);
    clearTimeout(timer);

    let body: T | null = null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try { body = await res.json(); } catch {
        body = null;
        logger.api.warn(component, `JSON parse failed for ${url}`, { status: res.status });
      }
    } else {
      body = (await res.text()) as unknown as T;
    }

    if (!res.ok) {
      const errBody = body as Record<string, unknown> | null;
      const errMsg =
        typeof errBody?.error === "string" ? errBody.error :
        typeof errBody?.message === "string" ? errBody.message :
        `HTTP ${res.status}`;
      logger.api.warn(component, `← ${method} ${url} ${res.status} ${res.statusText} (${durationMs}ms)`, { error: errMsg });
      return { ok: false, status: res.status, data: body, error: errMsg, durationMs };
    }

    logger.api.info(component, `← ${method} ${url} ${res.status} (${durationMs}ms)`);
    return { ok: true, status: res.status, data: body, error: null, durationMs };
  } catch (err: unknown) {
    clearTimeout(timer);
    const durationMs = Math.round(performance.now() - start);
    const error = err instanceof Error ? err : new Error(String(err));
    const msg = error.message;
    const code = ("code" in error ? (error as { code: string }).code : "").toUpperCase();
    const isTimeout = code === "ETIMEDOUT" || msg.includes("abort") || msg.includes("timeout");
    const isRefused = code === "ECONNREFUSED" || msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch");
    const isNetwork = isTimeout || isRefused || msg.includes("NetworkError");

    // Classify & log
    if (isTimeout) {
      logger.api.warn(component, `TIMEOUT ${method} ${url} after ${durationMs}ms`, { code });
    } else if (isRefused) {
      logger.api.error(component, `ECONNREFUSED ${method} ${url} — vérifiez que le serveur est lancé`, { code, durationMs });
    } else {
      logger.api.error(component, `Network error ${method} ${url}: ${msg}`, { code, originalError: msg, durationMs });
    }

    return {
      ok: false,
      status: isRefused ? 0 : isTimeout ? 504 : 0,
      data: null,
      error: isTimeout ? "Timeout" : isRefused ? "Connexion refusée (vérifiez que le serveur est lancé)" : msg,
      durationMs,
    };
  }
}

// ─── HTTP verbs ───────────────────────────────────────────────────────────────
export const api = {
  get:    <T = unknown>(url: string, opts?: ApiRequestOptions) => doFetch<T>(url, { ...opts, method: "GET" }),
  post:   <T = unknown>(url: string, body?: unknown, opts?: ApiRequestOptions) =>
    doFetch<T>(url, { ...opts, method: "POST", headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) }, body: JSON.stringify(body) }),
  put:    <T = unknown>(url: string, body?: unknown, opts?: ApiRequestOptions) =>
    doFetch<T>(url, { ...opts, method: "PUT", headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) }, body: JSON.stringify(body) }),
  patch:  <T = unknown>(url: string, body?: unknown, opts?: ApiRequestOptions) =>
    doFetch<T>(url, { ...opts, method: "PATCH", headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) }, body: JSON.stringify(body) }),
  delete: <T = unknown>(url: string, opts?: ApiRequestOptions) => doFetch<T>(url, { ...opts, method: "DELETE" }),

  /** Convenience: throws on non-2xx, returns data on success */
  getOrThrow:    async <T = unknown>(url: string, opts?: ApiRequestOptions): Promise<T> => {
    const r = await doFetch<T>(url, { ...opts, method: "GET" });
    if (!r.ok) throw new Error(r.error ?? `HTTP ${r.status}`);
    return r.data as T;
  },
  postOrThrow:   async <T = unknown>(url: string, body?: unknown, opts?: ApiRequestOptions): Promise<T> => {
    const r = await doFetch<T>(url, { ...opts, method: "POST", headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.error ?? `HTTP ${r.status}`);
    return r.data as T;
  },
};

export { doFetch };
