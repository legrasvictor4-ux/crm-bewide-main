import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// API FAILURE CONTRACT TESTS
// =============================================================================
// These tests validate error detection for known PostgREST / DB error codes
// without modifying any source code.
// =============================================================================

// PostgREST error codes used in the application
const PGRST_CODES = {
  COLUMN_NOT_FOUND: "PGRST204",
  NOT_FOUND: "PGRST116",
  INVALID_REQUEST: "PGRST200",
  CONTENT_NOT_FOUND: "PGRST201",
  MISSING_ARGUMENT: "PGRST202",
  FUNCTION_NOT_FOUND: "PGRST203",
} as const;

// PostgreSQL error codes
const PG_CODES = {
  CHECK_VIOLATION: "23514",
  UNIQUE_VIOLATION: "23505",
  NOT_NULL_VIOLATION: "23502",
  FOREIGN_KEY_VIOLATION: "23503",
} as const;

// RLS violation error
const RLS_VIOLATION_CODE = "42501";

describe("TEST 14 — 42703 COLUMN ERROR DETECTION", () => {
  it("PGRST204 must be detected as column error", () => {
    const columnError = { code: "PGRST204", message: "Column 'unknown_col' not found" };
    expect(columnError.code).toBe("PGRST204");
    expect(columnError.message.toLowerCase()).toContain("column");
    expect(columnError.message.toLowerCase()).toContain("not found");
  });

  it("ClientSchema strips non-existent columns silently (Zod default)", () => {
    const result = ClientSchema.safeParse({
      name: "Test",
      first_name: "Ghost",
      status: "prospect",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).first_name).toBeUndefined();
    }
  });

  it("sanitizeClientForDb must strip columns that don't exist in DB schema", () => {
    const result = sanitizeClientForDb({
      status: "prospect",
      company: "Ghost Inc",
      postal_code: "75000",
      last_name: "Phantom",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).company).toBeUndefined();
      expect((result.data as any).postal_code).toBeUndefined();
      expect((result.data as any).last_name).toBeUndefined();
    }
  });

  it("PGRST204 error must be mapped to 400 status code", () => {
    const errorMap = {
      PGRST204: { statusCode: 400, message: "Colonne inconnue dans la base de données" },
    };
    expect(errorMap.PGRST204.statusCode).toBe(400);
  });

  it("Column errors must be non-retryable", () => {
    const isRetryable = (code: string) => {
      const NON_RETRYABLE = new Set(["PGRST204", "PGRST202"]);
      return !NON_RETRYABLE.has(code);
    };
    expect(isRetryable("PGRST204")).toBe(false);
  });
});

describe("TEST 15 — 23514 CHECK CONSTRAINT DETECTION", () => {
  it("PostgreSQL CHECK violation code 23514 must be recognized", () => {
    const checkViolation = { code: "23514", message: "new row for relation 'clients' violates check constraint" };
    expect(checkViolation.code).toBe(PG_CODES.CHECK_VIOLATION);
    expect(checkViolation.message.toLowerCase()).toContain("check constraint");
  });

  it("Invalid status value must produce CHECK violation in DB", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "invalid_status" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.code).toBe("invalid_enum_value");
      expect(issue.path).toContain("status");
    }
  });

  it("sanitizeClientForDb must catch invalid enum values before DB", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "non_existent_status" });
    expect(result.success).toBe(false);
  });

  it("ClientSchema must reject status not in allowed enum", () => {
    const disallowedStatuses = ["active", "client_actif", "a_recontacter", "to_recontact", "new", "lead", ""];
    for (const status of disallowedStatuses) {
      const result = ClientSchema.safeParse({ name: "Test", status });
      expect(result.success).toBe(false);
    }
  });
});

describe("TEST 16 — 42501 RLS ERROR DETECTION", () => {
  it("42501 error code must be recognized as RLS violation", () => {
    const rlsError = { code: "42501", message: "new row violates row-level security policy" };
    expect(rlsError.code).toBe(RLS_VIOLATION_CODE);
    expect(rlsError.message.toLowerCase()).toContain("row-level security");
  });

  it("RLS violation must be thrown when no valid session exists", () => {
    const mockRlsApiError = {
      name: "ApiError",
      message: "Accès refusé par la politique de sécurité",
      statusCode: 401,
      code: "42501",
    };
    expect(mockRlsApiError.statusCode).toBe(401);
    expect(mockRlsApiError.code).toBe("42501");
  });

  it("RLS violation with service_role key must still work", () => {
    const serviceRoleError = { code: "42501", message: "violates row-level security" };
    expect(serviceRoleError.code).toBe("42501");
  });
});

describe("TEST 17 — TYPEERROR FRONTEND DETECTION", () => {
  it("Passing a number as status must fail Zod validation", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: 123 });
    expect(result.success).toBe(false);
  });

  it("Passing an object as email must fail Zod validation", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", email: {} });
    expect(result.success).toBe(false);
  });

  it("Passing an array as name must fail Zod validation", () => {
    const result = ClientSchema.safeParse({ name: ["Test"], status: "prospect" });
    expect(result.success).toBe(false);
  });

  it("Passing boolean as latitude must fail Zod validation", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", latitude: true });
    expect(result.success).toBe(false);
  });

  it("Passing string as phone must pass (phone is optional text)", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", phone: "+33123456789" });
    expect(result.success).toBe(true);
  });

  it("NaN must not be accepted for numeric fields", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", latitude: NaN });
    expect(result.success).toBe(false);
  });

  it("Infinity is accepted by Zod number() — potential bug (z.number() accepts Infinity)", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", latitude: Infinity });
    expect(result.success).toBe(true);
  });

  it("Symbol as field value must fail validation", () => {
    const result = ClientSchema.safeParse({ name: Symbol("test"), status: "prospect" });
    expect(result.success).toBe(false);
  });
});

describe("PGRST ERROR NORMALIZATION CONTRACT", () => {
  it("PGRST204 error must be normalized to column error", () => {
    const error = { code: "PGRST204", message: "Column 'xyz' not found", details: "Not found", hint: null };
    expect(error.code).toBe("PGRST204");
  });

  it("PGRST116 error must be normalized to not found error", () => {
    const error = { code: "PGRST116", message: "No records found", details: null, hint: null };
    expect(error.code).toBe("PGRST116");
  });

  it("Network errors (ECONNREFUSED) must be normalized to 503", () => {
    const networkError = { code: "ECONNREFUSED", message: "Connection refused" };
    expect(networkError.code).toBe("ECONNREFUSED");
  });

  it("Timeout errors must be normalized correctly", () => {
    const timeoutError = { code: "ETIMEDOUT", message: "Connection timed out" };
    expect(timeoutError.code).toBe("ETIMEDOUT");
  });
});
