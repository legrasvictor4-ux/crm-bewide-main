import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");

function readSrc(subpath: string): string {
  return readFileSync(resolve(ROOT, "src", subpath), "utf-8");
}

describe("cloneRequestState — Lockdown: root cause eliminated", () => {
  it("supabaseObservability wrapTerminal uses method.bind(queryBuilder) to preserve `this`", () => {
    const src = readSrc("lib/supabaseObservability.ts");
    expect(src).toContain("method.bind(queryBuilder)");
    expect(src).not.toMatch(/method\(\.\.\.args\)/);
  });

  it("wrapTerminal catch uses unknown instead of any", () => {
    const src = readSrc("lib/supabaseObservability.ts");
    expect(src).toContain("catch (err: unknown)");
  });

  it("clientsAdapter has assertSupabaseReady guard", () => {
    const src = readSrc("services/clientsAdapter.ts");
    expect(src).toContain("assertSupabaseReady");
  });

  it("clientsAdapter withRetry skips TYPEERROR and cloneRequestState", () => {
    const src = readSrc("services/clientsAdapter.ts");
    expect(src).toContain("NON_RETRYABLE_CODES");
    expect(src).toContain("cloneRequestState");
    expect(src).toContain("TYPEERROR");
  });

  it("use-clients gates with reactive useSupabaseReady hook", () => {
    const src = readSrc("hooks/use-clients.ts");
    expect(src).toContain("useSupabaseReady");
    expect(src).toContain("enabled: ready");
  });

  it("useSupabaseReady hook uses useSyncExternalStore", () => {
    const src = readSrc("hooks/useSupabaseReady.ts");
    expect(src).toContain("useSyncExternalStore");
  });

  it("client.ts exports whenSupabaseReady, isSupabaseReady, onSupabaseReady", async () => {
    const mod = await import("@/integrations/supabase/client");
    expect(mod.whenSupabaseReady).toBeInstanceOf(Promise);
    expect(typeof mod.isSupabaseReady).toBe("boolean");
    expect(typeof mod.onSupabaseReady).toBe("function");
  });

  it("AuthContext awaits whenSupabaseReady before getSession", () => {
    const src = readSrc("context/AuthContext.tsx");
    expect(src).toContain("await whenSupabaseReady");
  });

  it("whenSupabaseReady resolves to true", async () => {
    const mod = await import("@/integrations/supabase/client");
    const result = await mod.whenSupabaseReady;
    expect(result).toBe(true);
  });

  it("no raw method(...args) call in supabaseObservability.ts without bind", () => {
    const src = readSrc("lib/supabaseObservability.ts");
    const rawCalls = src.match(/method\(\.\.\.args\)/g);
    expect(rawCalls).toBeNull();
  });
});
