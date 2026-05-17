/**
 * globalErrorHandler.ts — Centralized error capture, normalization & classification
 *
 * Captures:
 *  - React unhandled errors (via window.onerror / onunhandledrejection)
 *  - Supabase PostgREST errors (PGRST204, etc.)
 *  - Network errors (ECONNREFUSED, ETIMEDOUT, fetch failures)
 *  - Voice AI pipeline errors
 *  - Async callback errors
 *
 * All errors are logged via logger and stored in the circular buffer.
 * No unhandled error is silently swallowed.
 */

import logger from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ErrorSource =
  | "react"
  | "supabase"
  | "api"
  | "voice_ai"
  | "scheduling"
  | "auth"
  | "test"
  | "unknown";

export type ErrorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface NormalizedError {
  source:      ErrorSource;
  severity:    ErrorSeverity;
  message:     string;
  code?:       string;     // e.g. PGRST204, ECONNREFUSED
  route?:      string;     // current URL or route at error time
  timestamp:   string;
  stack?:      string;
  context?:    Record<string, unknown>;
}

// ─── Classification rules ─────────────────────────────────────────────────────
function classify(err: unknown): { source: ErrorSource; severity: ErrorSeverity } {
  const e = err instanceof Error ? err : new Error(String(err));

  const msg = e.message.toLowerCase();
  const code = (e as any).code?.toUpperCase?.() || "";

  // Supabase / PostgREST
  if (code.startsWith("PGRST") || msg.includes("supabase") || msg.includes("postgrest")) {
    return { source: "supabase", severity: "HIGH" }; // HIGH = data integrity risk
  }

  // Network
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") {
    return { source: "api", severity: "HIGH" }; // HIGH = connectivity failure
  }

  // fetch TypeError / abort
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("aborted")) {
    return { source: "api", severity: "MEDIUM" };
  }

  // Voice AI
  if (msg.includes("voice") || msg.includes("speech") || msg.includes("dictation") || msg.includes("transcript")) {
    return { source: "voice_ai", severity: "MEDIUM" };
  }

  // React DOM / removeChild
  if (msg.includes("removeChild") || msg.includes("NotFoundError") || msg.includes("DOMException")) {
    return { source: "react", severity: "CRITICAL" }; // CRITICAL = UI crash
  }

  // React state after unmount
  if (msg.includes("unmount") || msg.includes("Can't perform a React state update")) {
    return { source: "react", severity: "CRITICAL" };
  }

  // Zod / validation
  if (msg.includes("zod") || msg.includes("validation")) {
    return { source: "api", severity: "MEDIUM" };
  }

  // Auth
  if (msg.includes("auth") || msg.includes("token") || msg.includes("unauthorized")) {
    return { source: "auth", severity: "HIGH" };
  }

  return { source: "unknown", severity: "MEDIUM" };
}

// ─── Normalization ────────────────────────────────────────────────────────────
export function normalizeError(
  err: unknown,
  opts?: { source?: ErrorSource; route?: string; context?: Record<string, unknown> }
): NormalizedError {
  const e = err instanceof Error ? err : new Error(String(err));

  const inferred = typeof opts?.source === "undefined" ? classify(e) : {
    source: opts!.source as ErrorSource,
    severity: classify(e).severity,
  };

  return {
    source:      inferred.source,
    severity:    inferred.severity,
    message:     e.message,
    code:        (e as any).code as string | undefined,
    route:       opts?.route,
    timestamp:   new Date().toISOString(),
    stack:       e.stack,
    context:     opts?.context,
  };
}

// ─── Logging helper ───────────────────────────────────────────────────────────
export function reportError(
  err: unknown,
  opts?: { source?: ErrorSource; component?: string; route?: string; context?: Record<string, unknown> }
) {
  const normalized = normalizeError(err, opts);
  const component = opts?.component || "global";
  const level = normalized.severity === "CRITICAL" ? "critical"
              : normalized.severity === "HIGH"     ? "error"
              : normalized.severity === "MEDIUM"   ? "warn"
              : "info";

  const domain = normalized.source.toUpperCase().replace("_", " ");

  const emitter = (() => {
    switch (normalized.source) {
      case "supabase":  return logger.supabase;
      case "react":     return logger.react;
      case "voice_ai":  return logger.voice;
      case "api":       return logger.api;
      default:          return logger;
    }
  })();

  const msgParts = [
    `code=${(normalized.code ?? "none").toUpperCase()}`,
    normalized.route ? `route=${normalized.route}` : undefined,
  ].filter(Boolean);
  const suffix = msgParts.length > 0 ? ` | ${msgParts.join(" | ")}` : "";

  const logMeta = level === "error" || level === "critical" ? {
    ...normalized.context,
    stack: (normalized.stack || "").split("\n").slice(0, 6).join("\n"),
    code: normalized.code,
    source: normalized.source,
    severity: normalized.severity,
  } : normalized.context;

  if (level === "error" || level === "critical") {
    (emitter as Record<string, (c: string, m: string, meta?: Record<string, unknown>) => void>)[level](component, `${normalized.message}${suffix}`, logMeta);
  } else {
    (emitter as Record<string, (c: string, m: string, meta?: Record<string, unknown>) => void>)[level](component, `${normalized.message}${suffix}`, logMeta);
  }

  return normalized;
}

// ─── Global error listeners ───────────────────────────────────────────────────
const GLOBAL_HANDLERS_SETUP_KEY = "__global_error_handlers_installed__";

export function installGlobalErrorHandlers(opts?: { source?: ErrorSource }) {
  if (typeof window === "undefined") return;
  if ((window as Record<string, unknown>)[GLOBAL_HANDLERS_SETUP_KEY]) return;
  (window as Record<string, unknown>)[GLOBAL_HANDLERS_SETUP_KEY] = true;

  const src = opts?.source || "unknown";

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      source:  event.error instanceof Error && event.error.message.includes("Supabase") ? "supabase" : src,
      component: "window.onerror",
      route:   window.location?.pathname,
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, {
      source:  src,
      component: "unhandledrejection",
      route:   window.location?.pathname,
      context: {
        promise: event.promise?.toString?.() ?? "unknown",
      },
    });
  });
}

export type { NormalizedError };
