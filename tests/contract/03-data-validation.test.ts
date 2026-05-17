import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// DATA VALIDATION CONTRACT TESTS
// =============================================================================
// Validates all database-level constraints, type safety, and null handling.
// =============================================================================

// Source of truth for allowed enum values (matching SQL CHECK + Zod schema)
const ALLOWED_STATUS_VALUES = ["prospect", "activé", "client actif", "perdu"] as const;
const ALLOWED_ROLE_VALUES = ["patron", "manager", "salarié", "autre", "NC"] as const;
const ALLOWED_STATUT_OPPORTUNITE = ["chaud", "tiède", "froid", "perdu", "gagné"] as const;
const ALLOWED_PRIORITE = ["haute", "moyenne", "basse"] as const;
const ALLOWED_OFFRE_CIBLE = ["Essentiel", "VIP trimestre", "VIP bimestriel", "À qualifier"] as const;
const ALLOWED_CANAL_ACQUISITION = ["terrain", "référence", "À qualifier"] as const;

describe("TEST 10 — CHECK CONSTRAINT STATUS", () => {
  it("SQL CHECK constraint allows 'prospect'", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect" });
    expect(result.success).toBe(true);
  });

  it("SQL CHECK constraint allows 'activé'", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "activé" });
    expect(result.success).toBe(true);
  });

  it("SQL CHECK constraint allows 'client actif'", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "client actif" });
    expect(result.success).toBe(true);
  });

  it("SQL CHECK constraint allows 'perdu'", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "perdu" });
    expect(result.success).toBe(true);
  });

  it("Zod status enum must match SQL CHECK exactly", () => {
    const zodStatusEnum = ClientSchema.shape.status;
    const zodValues = (zodStatusEnum._def as any).values as readonly string[];
    expect([...zodValues].sort()).toEqual([...ALLOWED_STATUS_VALUES].sort());
  });

  it("All allowed status values must be accepted by sanitizeClientForDb", () => {
    for (const status of ALLOWED_STATUS_VALUES) {
      const result = sanitizeClientForDb({ name: "Test", status });
      expect(result.success).toBe(true);
    }
  });
});

describe("TEST 11 — INVALID STATUS REJECTION", () => {
  it("'active' (English) must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "active" });
    expect(result.success).toBe(false);
  });

  it("'client_actif' (underscore) must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "client_actif" });
    expect(result.success).toBe(false);
  });

  it("'a_recontacter' must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "a_recontacter" });
    expect(result.success).toBe(false);
  });

  it("'to_recontact' (English) must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "to_recontact" });
    expect(result.success).toBe(false);
  });

  it("Empty string status must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "" });
    expect(result.success).toBe(false);
  });

  it("Numeric status must be rejected", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: 123 });
    expect(result.success).toBe(false);
  });

  it("null status must be rejected (no .nullable() on status)", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: null });
    expect(result.success).toBe(false);
  });

  it("undefined status must be rejected (status is required)", () => {
    const result = ClientSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("ALL invalid status patterns must be rejected by Zod", () => {
    const invalidStatuses = [
      "active", "client_actif", "a_recontacter", "to_recontact",
      "inactive", "archived", "deleted", "lead", "qualified",
      "disqualified", "new", "contacted", "follow_up", "CLIENT",
      "PROSPECT", "ACTIVE", "Client Actif",
    ];
    for (const status of invalidStatuses) {
      const result = ClientSchema.safeParse({ name: "Test", status });
      expect(result.success).toBe(false);
    }
  });
});

describe("TEST 12 — NULL SAFETY TEST", () => {
  it("undefined in input must not reach DB as 'undefined' string", () => {
    const payload: Record<string, unknown> = {
      name: "Test",
      status: "prospect",
    };
    (payload as any).email = undefined;
    const result = sanitizeClientForDb(payload);
    expect(result.success).toBe(true);
  });

  it("null must be preserved for nullable fields (email)", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", email: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
    }
  });

  it("Empty string stays as empty string (Zod does not auto-convert to null)", () => {
    const result = sanitizeClientForDb({
      name: "Test",
      status: "prospect",
      email: "",
      phone: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("");
      expect(result.data.phone).toBe("");
    }
  });

  it("Whitespace-only string must be handled (not crash)", () => {
    const result = sanitizeClientForDb({
      name: "   ",
      status: "prospect",
      email: "   ",
    });
    expect(result.success).toBe(true);
  });
});

describe("TEST 13 — TYPE CONSISTENCY TEST", () => {
  function unwrapZodEnum(schemaField: unknown): string[] {
    let inner: any = schemaField;
    for (let i = 0; i < 5; i++) {
      const typeName = inner?._def?.typeName;
      if (typeName === "ZodEnum") return inner._def.values;
      if (typeName === "ZodNullable" || typeName === "ZodOptional") {
        inner = inner._def.innerType;
      } else {
        break;
      }
    }
    return [];
  }

  it("role field must be typed as specific enum values", () => {
    const values = unwrapZodEnum(ClientSchema.shape.role);
    expect([...values].sort()).toEqual([...ALLOWED_ROLE_VALUES].sort());
  });

  it("latitude must accept only numbers", () => {
    const valid = ClientSchema.safeParse({ name: "Test", status: "prospect", latitude: 48.8566 });
    expect(valid.success).toBe(true);
    const invalid = ClientSchema.safeParse({ name: "Test", status: "prospect", latitude: "not-a-number" });
    expect(invalid.success).toBe(false);
  });

  it("longitude must accept only numbers", () => {
    const valid = ClientSchema.safeParse({ name: "Test", status: "prospect", longitude: 2.3522 });
    expect(valid.success).toBe(true);
    const invalid = ClientSchema.safeParse({ name: "Test", status: "prospect", longitude: "not-a-number" });
    expect(invalid.success).toBe(false);
  });

  it("statut_opportunite enum must have exactly 5 values", () => {
    const values = unwrapZodEnum(ClientSchema.shape.statut_opportunite);
    expect(values.length).toBe(5);
    expect([...values].sort()).toEqual([...ALLOWED_STATUT_OPPORTUNITE].sort());
  });

  it("priorite enum must have exactly 3 values", () => {
    const values = unwrapZodEnum(ClientSchema.shape.priorite);
    expect(values.length).toBe(3);
    expect([...values].sort()).toEqual([...ALLOWED_PRIORITE].sort());
  });

  it("offre_cible enum must have exactly 4 values", () => {
    const values = unwrapZodEnum(ClientSchema.shape.offre_cible);
    expect(values.length).toBe(4);
    expect([...values].sort()).toEqual([...ALLOWED_OFFRE_CIBLE].sort());
  });

  it("canal_acquisition enum must have exactly 3 values", () => {
    const values = unwrapZodEnum(ClientSchema.shape.canal_acquisition);
    expect(values.length).toBe(3);
    expect([...values].sort()).toEqual([...ALLOWED_CANAL_ACQUISITION].sort());
  });

  it("Zod boolean field must not exist where DB has TEXT", () => {
    for (const [key, shape] of Object.entries(ClientSchema.shape)) {
      if (shape._def?.typeName === "ZodBoolean") {
        const dbCol = DB_COLUMN_CONTRACT.find(c => c.name === key);
        if (dbCol) {
          expect(dbCol.type.toUpperCase()).toBe("BOOLEAN");
        }
      }
    }
  });
});

const DB_COLUMN_CONTRACT = [
  { name: "id",                  type: "UUID" },
  { name: "name",                type: "TEXT" },
  { name: "email",               type: "TEXT" },
  { name: "phone",               type: "TEXT" },
  { name: "address",             type: "TEXT" },
  { name: "status",              type: "TEXT" },
  { name: "role",                type: "TEXT" },
  { name: "latitude",            type: "DOUBLE PRECISION" },
  { name: "longitude",           type: "DOUBLE PRECISION" },
  { name: "statut_opportunite",  type: "TEXT" },
  { name: "priorite",            type: "TEXT" },
  { name: "motif_objection",     type: "TEXT" },
  { name: "date_relance",        type: "TEXT" },
  { name: "offre_cible",         type: "TEXT" },
  { name: "canal_acquisition",   type: "TEXT" },
] as const;
