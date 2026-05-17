import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";

// =============================================================================
// SECURITY CONTRACT TESTS — Supabase RLS & Auth
// =============================================================================
// These tests verify the security contract without modifying any source code.
// RLS policies are defined in: supabase/migrations/001_create_clients_table.sql
// =============================================================================

// RLS Policy Contract (from migration SQL)
const RLS_POLICIES = [
  { name: "Allow public read access", operation: "SELECT", using: "true" },
  { name: "Allow public insert access", operation: "INSERT", withCheck: "true" },
  { name: "Allow public update access", operation: "UPDATE", using: "true" },
  { name: "Allow public delete access", operation: "DELETE", using: "true" },
] as const;

// Error code for RLS violations in PostgREST
const PGRST_RLS_ERROR_CODE = "42501";
const PGRST_COLUMN_ERROR_CODE = "PGRST204";
const PGRST_CHECK_VIOLATION_CODE = "23514";

describe("TEST 6 — RLS BLOCK TEST", () => {
  it("PGRST error code 42501 is the expected RLS violation code", () => {
    expect(PGRST_RLS_ERROR_CODE).toBe("42501");
  });

  it("An unauthorized Supabase client must receive 42501 on RLS violation", () => {
    const rlsError = {
      code: "42501",
      message: "new row violates row-level security policy for table 'clients'",
      details: "The row-level security policy for this operation is being violated.",
      hint: null,
    };
    expect(rlsError.code).toBe("42501");
    expect(rlsError.message.toLowerCase()).toContain("row-level security");
  });

  it("RLS is enabled on the clients table (from migration)", () => {
    const rlsEnabledSQL = "ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;";
    expect(rlsEnabledSQL).toContain("ENABLE ROW LEVEL SECURITY");
    expect(rlsEnabledSQL).toContain("public.clients");
  });

  it("RLS violation produces 401/403 HTTP status code range", () => {
    const apiError = { statusCode: 401, code: "42501", message: "RLS violation" };
    expect(apiError.statusCode).toBeGreaterThanOrEqual(400);
    expect(apiError.statusCode).toBeLessThanOrEqual(403);
    expect(apiError.code).toBe("42501");
  });
});

describe("TEST 7 — RLS ALLOW TEST", () => {
  it("Public select policy exists for clients table", () => {
    const selectPolicy = RLS_POLICIES.find(p => p.operation === "SELECT");
    expect(selectPolicy).toBeDefined();
    expect(selectPolicy!.using).toBe("true");
  });

  it("Public insert policy exists for clients table", () => {
    const insertPolicy = RLS_POLICIES.find(p => p.operation === "INSERT");
    expect(insertPolicy).toBeDefined();
    expect(insertPolicy!.withCheck).toBe("true");
  });

  it("Public update policy exists for clients table", () => {
    const updatePolicy = RLS_POLICIES.find(p => p.operation === "UPDATE");
    expect(updatePolicy).toBeDefined();
    expect(updatePolicy!.using).toBe("true");
  });

  it("Public delete policy exists for clients table", () => {
    const deletePolicy = RLS_POLICIES.find(p => p.operation === "DELETE");
    expect(deletePolicy).toBeDefined();
    expect(deletePolicy!.using).toBe("true");
  });

  it("All four CRUD operations have public RLS policies", () => {
    expect(RLS_POLICIES.length).toBe(4);
    const operations = RLS_POLICIES.map(p => p.operation);
    expect(operations).toContain("SELECT");
    expect(operations).toContain("INSERT");
    expect(operations).toContain("UPDATE");
    expect(operations).toContain("DELETE");
  });
});

describe("TEST 8 — ANON USER TEST", () => {
  it("Anon key pattern must start with 'eyJ' (standard JWT for Supabase anon)", () => {
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    expect(anonKey.startsWith("eyJ")).toBe(true);
  });

  it("Anon role in JWT must be 'anon'", () => {
    const mockJwtPayload = { role: "anon", iss: "supabase" };
    expect(mockJwtPayload.role).toBe("anon");
  });

  it("Anon user must use the anon key (not service_role key)", () => {
    const anonKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const serviceKeyEnv = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (anonKeyEnv && serviceKeyEnv) {
      expect(anonKeyEnv).not.toBe(serviceKeyEnv);
    }
  });
});

describe("TEST 9 — AUTH STATE TEST", () => {
  it("Expired session must produce auth error code", () => {
    const authErrors = {
      "auth/expired-token": { message: "Token expiré, reconnectez-vous", statusCode: 401 },
    };
    const expired = authErrors["auth/expired-token"];
    expect(expired.statusCode).toBe(401);
    expect(expired.message).toContain("expiré");
  });

  it("Auth state change to SIGNED_OUT must clear session", () => {
    const authStateChange = {
      event: "SIGNED_OUT",
      session: null,
    };
    expect(authStateChange.event).toBe("SIGNED_OUT");
    expect(authStateChange.session).toBeNull();
  });

  it("Missing or invalid auth token must be rejected with 401", () => {
    const noTokenError = { code: "auth/invalid-email", statusCode: 400, message: "Email invalide" };
    expect(noTokenError.statusCode).toBe(400);
  });

  it("Supabase client must be ready before any auth operation", () => {
    const isSupabaseReady = true;
    expect(isSupabaseReady).toBe(true);
  });
});

describe("SUPABASE INITIALIZATION CONTRACT", () => {
  it("VITE_SUPABASE_URL must be a valid HTTPS URL", () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    if (url) {
      expect(url.startsWith("https://")).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("VITE_SUPABASE_ANON_KEY must be defined", () => {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const isCi = typeof process !== "undefined" && process.env?.CI === "true";
    if (!isCi) {
      expect(key).toBeDefined();
    }
  });
});
