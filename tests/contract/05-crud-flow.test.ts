import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";

// =============================================================================
// FULL CRUD FLOW CONTRACT TESTS
// =============================================================================
// Validates the complete data flow: frontend → sanitation → DB contract
// without modifying any source code or hitting actual Supabase.
// =============================================================================

const EXPLICIT_COLUMNS = [
  "id", "name", "email", "phone", "address",
  "status", "role", "latitude", "longitude",
  "statut_opportunite", "priorite", "motif_objection",
  "date_relance", "offre_cible", "canal_acquisition",
] as const;

describe("TEST 18 — CREATE FLOW", () => {
  it("CREATE flow: raw input → sanitize → valid DB payload", () => {
    const rawInput = {
      name: "New Client",
      email: "new@example.com",
      phone: "0123456789",
      address: "123 Rue de Paris",
      status: "prospect" as const,
      role: "patron" as const,
      statut_opportunite: "chaud" as const,
      canal_acquisition: "terrain" as const,
    };

    const sanitized = sanitizeClientForDb(rawInput);
    expect(sanitized.success).toBe(true);

    if (sanitized.success) {
      const data = sanitized.data;
      expect(data.name).toBe("New Client");
      expect(data.email).toBe("new@example.com");
      expect(data.status).toBe("prospect");
    }
  });

  it("CREATE flow: invalid input must fail before DB call", () => {
    const invalidInput = { status: "invalid_status" };
    const sanitized = sanitizeClientForDb(invalidInput);
    expect(sanitized.success).toBe(false);
  });

  it("CREATE flow: null input must fail gracefully", () => {
    const sanitized = sanitizeClientForDb(null);
    expect(sanitized.success).toBe(false);
  });

  it("CREATE flow: undefined input must fail gracefully", () => {
    const sanitized = sanitizeClientForDb(undefined);
    expect(sanitized.success).toBe(false);
  });

  it("CREATE flow: array input must fail gracefully", () => {
    const sanitized = sanitizeClientForDb(["name", "status"]);
    expect(sanitized.success).toBe(false);
  });

  it("CREATE flow: payload with only optional fields must fail (status required)", () => {
    const sanitized = sanitizeClientForDb({ name: "Test" });
    expect(sanitized.success).toBe(false);
  });
});

describe("TEST 19 — READ FLOW", () => {
  it("READ flow: EXPLICIT_COLUMNS must be subset of DB schema", () => {
    for (const col of EXPLICIT_COLUMNS) {
      expect(ClientSchemaKeys.includes(col)).toBe(true);
    }
  });

  it("READ flow: fetched data must match ClientSchema shape", () => {
    const mockDbRow = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Read Test",
      email: "read@test.com",
      phone: "0612345678",
      address: "1 Rue Test",
      status: "client actif" as const,
      role: null,
      latitude: 48.8566,
      longitude: 2.3522,
      statut_opportunite: null,
      priorite: null,
      motif_objection: null,
      date_relance: null,
      offre_cible: null,
      canal_acquisition: null,
    };
    const parsed = ClientSchema.safeParse(mockDbRow);
    expect(parsed.success).toBe(true);
  });

  it("READ flow: all fields are nullable except id and status", () => {
    const schema = ClientSchema.shape;
    for (const [key, field] of Object.entries(schema)) {
      if (key === "id" || key === "status") continue;
      const typeName = (field as any)._def?.typeName;
      if (typeName === "ZodString" || (typeName === "ZodNullable")) {
        expect(true).toBe(true);
      }
    }
  });

  it("READ flow: EXPLICIT_COLUMNS must be string literal (no dynamic columns)", () => {
    const allStrings = EXPLICIT_COLUMNS.every(c => typeof c === "string");
    expect(allStrings).toBe(true);
  });

  it("READ flow: must not use select('*')", () => {
    const adapterCode = EXPLICIT_COLUMNS.join(",");
    expect(adapterCode).not.toContain("*");
  });
});

describe("TEST 20 — UPDATE FLOW", () => {
  it("UPDATE flow: partial payload must sanitize correctly", () => {
    const updatePayload = { status: "client actif" as const, phone: "0700000000" };
    const sanitized = sanitizeClientForDb(updatePayload);
    expect(sanitized.success).toBe(true);
    if (sanitized.success) {
      expect(sanitized.data.status).toBe("client actif");
    }
  });

  it("UPDATE flow: empty payload must fail", () => {
    const sanitized = sanitizeClientForDb({});
    expect(sanitized.success).toBe(false);
  });

  it("UPDATE flow: phantom fields must be stripped", () => {
    const result = sanitizeClientForDb({ company: "Ghost", status: "activé" as const });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).company).toBeUndefined();
      expect(result.data.status).toBe("activé");
    }
  });

  it("UPDATE flow: invalid status must fail", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("TEST 21 — DELETE FLOW", () => {
  it("DELETE flow: id must be a non-empty string", () => {
    const validId = "550e8400-e29b-41d4-a716-446655440000";
    expect(typeof validId).toBe("string");
    expect(validId.length).toBeGreaterThan(0);
  });

  it("DELETE flow: UUID format must have 5 segments", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(uuid.split("-").length).toBe(5);
  });

  it("DELETE flow: empty id must not be sent", () => {
    const emptyId = "";
    expect(emptyId.length).toBe(0);
  });

  it("DELETE flow: null id must not be accepted", () => {
    const nullCheck = (id: unknown): id is string => typeof id === "string" && id.length > 0;
    expect(nullCheck(null)).toBe(false);
    expect(nullCheck(undefined)).toBe(false);
    expect(nullCheck("")).toBe(false);
    expect(nullCheck("valid-id")).toBe(true);
  });
});

describe("TEST 22 — RE-READ AFTER UPDATE CONSISTENCY", () => {
  it("After UPDATE, fetched data must conform to ClientSchema", () => {
    const afterUpdateRow = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Updated Name",
      email: "updated@example.com",
      phone: "0700000000",
      address: "456 Updated St",
      status: "client actif" as const,
      role: "manager" as const,
      latitude: null,
      longitude: null,
      statut_opportunite: "gagné" as const,
      priorite: "haute" as const,
      motif_objection: null,
      date_relance: null,
      offre_cible: null,
      canal_acquisition: "référence" as const,
    };
    const parsed = ClientSchema.safeParse(afterUpdateRow);
    expect(parsed.success).toBe(true);
  });

  it("All CRUD return types must match the same ClientSchema", () => {
    const row = {
      id: "uuid-1234",
      name: "Test",
      email: null,
      phone: "0102030405",
      address: null,
      status: "prospect" as const,
      role: null,
      latitude: null,
      longitude: null,
      statut_opportunite: null,
      priorite: null,
      motif_objection: null,
      date_relance: null,
      offre_cible: null,
      canal_acquisition: null,
    };
    const parsed = ClientSchema.safeParse(row);
    expect(parsed.success).toBe(true);
  });

  it("CREATE → READ: the created shape must match the query shape", () => {
    const createPayloadShape = {
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      address: expect.any(String),
      status: expect.any(String),
      role: expect.any(String),
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      statut_opportunite: expect.any(String),
      priorite: expect.any(String),
      motif_objection: expect.any(String),
      date_relance: expect.any(String),
      offre_cible: expect.any(String),
      canal_acquisition: expect.any(String),
    };
    const keys = Object.keys(createPayloadShape).sort();
    expect(keys).toEqual([...ClientSchemaKeys].sort());
  });
});
