import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");

function readSrc(subpath: string): string {
  return readFileSync(resolve(ROOT, "src", subpath), "utf-8");
}

describe("Supabase Init Race Condition — No Query Before Ready", () => {
  it("client.ts exports isSupabaseReady and whenSupabaseReady", async () => {
    const mod = await import("@/integrations/supabase/client");
    expect(mod.isSupabaseReady).toBeDefined();
    expect(typeof mod.isSupabaseReady).toBe("boolean");
    expect(mod.whenSupabaseReady).toBeInstanceOf(Promise);
  });

  it("useSupabaseReady hook exists and is used by use-clients.ts", () => {
    const src = readSrc("hooks/use-clients.ts");
    expect(src).toContain("useSupabaseReady");
    expect(src).toContain("enabled: ready");
    expect(readFileSync(resolve(ROOT, "src/hooks/useSupabaseReady.ts"), "utf-8")).toContain("useSyncExternalStore");
  });

  it("clientsAdapter.ts guards each operation with assertSupabaseReady", () => {
    const src = readSrc("services/clientsAdapter.ts");
    expect(src).toContain("assertSupabaseReady");
    expect(src).toContain("SUPABASE_NOT_READY");
  });

  it("withRetry skips non-retryable init errors (TYPEERROR, cloneRequestState)", () => {
    const src = readSrc("services/clientsAdapter.ts");
    expect(src).toContain("NON_RETRYABLE_CODES");
    expect(src).toContain("TYPEERROR");
    expect(src).toContain("cloneRequestState");
  });

  it("AuthContext awaits whenSupabaseReady before syncSession", () => {
    const src = readSrc("context/AuthContext.tsx");
    expect(src).toContain("await whenSupabaseReady");
    expect(src).toContain("import { supabase, whenSupabaseReady }");
  });

  it("useSupabaseReady hook returns boolean", () => {
    const src = readSrc("hooks/useSupabaseReady.ts");
    expect(src).toContain("boolean");
    expect(src).toContain("useSyncExternalStore");
  });

  it("onSupabaseReady subscription is exported from client.ts", () => {
    const src = readSrc("integrations/supabase/client.ts");
    expect(src).toContain("onSupabaseReady");
    expect(src).toContain("_listeners");
  });

  it("whenSupabaseReady resolves to boolean true", async () => {
    const mod = await import("@/integrations/supabase/client");
    const result = await mod.whenSupabaseReady;
    expect(result).toBe(true);
  });
});
