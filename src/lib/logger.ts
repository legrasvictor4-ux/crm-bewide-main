/**
 * logger.ts — Structured SSR-safe logger
 *
 * Format: [DOMAIN][LEVEL][COMPONENT] message
 *
 * Domains:
 *   SUPABASE | REACT | VOICE_AI | API | TEST | SCHEDULING | AUTH | UNKNOWN
 * Levels:
 *   INFO | WARN | ERROR | CRITICAL | DEBUG
 *
 * In test env: only ERROR+ are emitted unless LOG_LEVEL=debug is set.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
type Domain =
  | "SUPABASE"
  | "REACT"
  | "VOICE_AI"
  | "API"
  | "TEST"
  | "SCHEDULING"
  | "AUTH"
  | "UNKNOWN";

type Level = "INFO" | "WARN" | "ERROR" | "CRITICAL" | "DEBUG";

interface LogEntry {
  ts: string;
  domain: Domain;
  level: Level;
  component: string;
  message: string;
  meta?: Record<string, unknown>;
}

// ─── Environment detection ────────────────────────────────────────────────────
const isTestEnv =
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";
const isDevEnv =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

// Minimum level: DEBUG only in dev/test with LOG_LEVEL=debug env var
const getMinLevel = (): Level => {
  if (isTestEnv) return "ERROR";
  const envLevel = (typeof process !== "undefined" ? process.env?.LOG_LEVEL : undefined)?.toUpperCase();
  if (envLevel === "DEBUG") return "DEBUG";
  if (envLevel === "INFO") return "INFO";
  return isDevEnv ? "INFO" : "WARN";
};

const minLevel = getMinLevel();

const levelPriority: Record<Level, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4,
};

// Circular buffer of last N log entries (for DevPanel / error reporting)
const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER = 200;

// ─── Core log function ────────────────────────────────────────────────────────
function emit(entry: LogEntry) {
  if (levelPriority[entry.level] < levelPriority[minLevel]) return;

  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) LOG_BUFFER.shift();

  const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";
  const line = `[${entry.domain}][${entry.level}][${entry.component}] ${entry.message}${metaStr}`;

  switch (entry.level) {
    case "CRITICAL":
    case "ERROR":
      console.error(line);
      break;
    case "WARN":
      console.warn(line);
      break;
    default:
      console.info(line);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
const logger = {
  info:    (component: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), domain: "UNKNOWN", level: "INFO", component, message, meta }),
  warn:    (component: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), domain: "UNKNOWN", level: "WARN", component, message, meta }),
  error:   (component: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), domain: "UNKNOWN", level: "ERROR", component, message, meta }),
  critical:(component: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), domain: "UNKNOWN", level: "CRITICAL", component, message, meta }),
  debug:   (component: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), domain: "UNKNOWN", level: "DEBUG", component, message, meta }),

  // Domain-specific helpers
  supabase: {
    info:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "SUPABASE", level: "INFO", component, message, meta }),
    warn:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "SUPABASE", level: "WARN", component, message, meta }),
    error:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "SUPABASE", level: "ERROR", component, message, meta }),
    critical:(component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "SUPABASE", level: "CRITICAL", component, message, meta }),
    debug:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "SUPABASE", level: "DEBUG", component, message, meta }),
  },

  react: {
    info:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "REACT", level: "INFO", component, message, meta }),
    warn:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "REACT", level: "WARN", component, message, meta }),
    error:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "REACT", level: "ERROR", component, message, meta }),
    critical:(component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "REACT", level: "CRITICAL", component, message, meta }),
    debug:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "REACT", level: "DEBUG", component, message, meta }),
  },

  voice: {
    info:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "VOICE_AI", level: "INFO", component, message, meta }),
    warn:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "VOICE_AI", level: "WARN", component, message, meta }),
    error:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "VOICE_AI", level: "ERROR", component, message, meta }),
    debug:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "VOICE_AI", level: "DEBUG", component, message, meta }),
  },

  api: {
    info:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "API", level: "INFO", component, message, meta }),
    warn:    (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "API", level: "WARN", component, message, meta }),
    error:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "API", level: "ERROR", component, message, meta }),
    critical:(component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "API", level: "CRITICAL", component, message, meta }),
    debug:   (component: string, message: string, meta?: Record<string, unknown>) =>
      emit({ ts: new Date().toISOString(), domain: "API", level: "DEBUG", component, message, meta }),
  },

  /** Read the in-memory log buffer (for DevPanel / tests) */
  getBuffer: (): readonly LogEntry[] => LOG_BUFFER.slice(),
  /** Clear the buffer — useful between tests */
  clearBuffer: () => { LOG_BUFFER.length = 0; },
};

export default logger;
