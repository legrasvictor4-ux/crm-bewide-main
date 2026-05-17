const BOOT_KEY = "bw:boot";
const BOOT_TIMEOUT = 10000;

export interface BootTrace {
  ts: number;
  phase: string;
  ok: boolean;
  detail?: string;
}

function record(phase: string, ok: boolean, detail?: string) {
  const trace: BootTrace = { ts: Date.now(), phase, ok, detail };
  try {
    const prev: BootTrace[] = JSON.parse(sessionStorage.getItem(BOOT_KEY) || "[]");
    prev.push(trace);
    sessionStorage.setItem(BOOT_KEY, JSON.stringify(prev));
  } catch { /* no-op */ }
  if (!ok) console.error(`[Boot] FAIL ${phase}${detail ? ` — ${detail}` : ""}`);
}

function bootHealthCheck() {
  const traces: BootTrace[] = JSON.parse(sessionStorage.getItem(BOOT_KEY) || "[]");
  const root = document.getElementById("root");
  const hasContent = root && root.children.length > 0;
  const fatal = traces.filter((t) => !t.ok);
  if (fatal.length > 0 || !hasContent) {
    console.error("[Boot] WHITE SCREEN DETECTED", { traces, hasContent });
  }
}

if (typeof window !== "undefined") {
  record("module_loaded", true);
  window.addEventListener("DOMContentLoaded", () => {
    record("dom_content_loaded", true);
    setTimeout(bootHealthCheck, BOOT_TIMEOUT);
  });
  window.addEventListener("load", () => record("window_load", true));
}

export { record as bootLog, bootHealthCheck };
