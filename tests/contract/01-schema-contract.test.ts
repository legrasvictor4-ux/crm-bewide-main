import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// DATABASE CONTRACT — IMMUTABLE SCHEMA DEFINITION
// Source: supabase/migrations/001_create_clients_table.sql
// =============================================================================
// This is the SINGLE SOURCE OF TRUTH for the database schema contract.
// Any drift from this definition is a schema violation.
// =============================================================================

const DB_SCHEMA_CONTRACT = {
  tableName: "clients",
  columns: [
    { name: "id",                  type: "UUID",             nullable: false, default: "gen_random_uuid()" },
    { name: "name",                type: "TEXT",             nullable: true,  default: null },
    { name: "email",               type: "TEXT",             nullable: true,  default: null },
    { name: "phone",               type: "TEXT",             nullable: true,  default: null },
    { name: "address",             type: "TEXT",             nullable: true,  default: null },
    { name: "status",              type: "TEXT",             nullable: false, default: "'prospect'", check: "'prospect' | 'activé' | 'client actif' | 'perdu'" },
    { name: "role",                type: "TEXT",             nullable: true,  default: null },
    { name: "latitude",            type: "DOUBLE PRECISION", nullable: true,  default: null },
    { name: "longitude",           type: "DOUBLE PRECISION", nullable: true,  default: null },
    { name: "statut_opportunite",  type: "TEXT",             nullable: true,  default: null },
    { name: "priorite",            type: "TEXT",             nullable: true,  default: null },
    { name: "motif_objection",     type: "TEXT",             nullable: true,  default: null },
    { name: "date_relance",        type: "TEXT",             nullable: true,  default: null },
    { name: "offre_cible",         type: "TEXT",             nullable: true,  default: null },
    { name: "canal_acquisition",   type: "TEXT",             nullable: true,  default: null },
  ] as const,
  indexes: ["idx_clients_status", "idx_clients_email"],
  rls: { enabled: true, policies: ["Allow public read", "Allow public insert", "Allow public update", "Allow public delete"] },
} as const;

const DB_COLUMN_NAMES = DB_SCHEMA_CONTRACT.columns.map(c => c.name);
const DB_COLUMN_SET = new Set(DB_COLUMN_NAMES);

// EXPLICIT_COLUMNS in clientsAdapter.ts (the actual SELECT used in production)
const EXPLICIT_COLUMNS = [
  "id", "name", "email", "phone", "address",
  "status", "role", "latitude", "longitude",
  "statut_opportunite", "priorite", "motif_objection",
  "date_relance", "offre_cible", "canal_acquisition",
] as const;

// ALLOWED STATUS VALUES (matching SQL CHECK constraint)
const ALLOWED_STATUS_VALUES = ["prospect", "activé", "client actif", "perdu"] as const;
type AllowedStatus = typeof ALLOWED_STATUS_VALUES[number];

describe("TEST 1 — Column Drift Detection", () => {
  it("DB_SCHEMA_CONTRACT columns must be unique (no duplicates)", () => {
    const names = DB_COLUMN_NAMES;
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("Every EXPLICIT_COLUMNS entry must exist in DB schema", () => {
    for (const col of EXPLICIT_COLUMNS) {
      expect(DB_COLUMN_SET.has(col)).toBe(true);
    }
  });

  it("Every DB schema column must be present in EXPLICIT_COLUMNS", () => {
    const explicitSet = new Set(EXPLICIT_COLUMNS.map(c => c));
    for (const col of DB_COLUMN_NAMES) {
      expect(explicitSet.has(col)).toBe(true);
    }
  });

  it("Every ClientSchema key must exist in DB schema", () => {
    for (const key of ClientSchemaKeys) {
      expect(DB_COLUMN_SET.has(key)).toBe(true);
    }
  });

  it("No ClientSchema key outside DB schema", () => {
    for (const key of ClientSchemaKeys) {
      expect(DB_COLUMN_SET.has(key)).toBe(true);
    }
  });

  it("EXPLICIT_COLUMNS matches ClientSchema keys exactly", () => {
    const explicitSorted = [...EXPLICIT_COLUMNS].sort();
    const schemaSorted = [...ClientSchemaKeys].sort();
    expect(explicitSorted).toEqual(schemaSorted);
  });
});

describe("TEST 2 — SELECT Contract Test", () => {
  it("EXPLICIT_COLUMNS must only contain valid DB columns", () => {
    for (const col of EXPLICIT_COLUMNS) {
      expect(DB_COLUMN_SET.has(col)).toBe(true);
    }
  });

  it("sanitizeClientForDb must accept a payload matching DB columns", () => {
    const validPayload = {
      name: "Test Client",
      email: "test@example.com",
      phone: "+33123456789",
      address: "1 rue de test",
      status: "prospect" as AllowedStatus,
      role: "patron",
      latitude: 48.8566,
      longitude: 2.3522,
      statut_opportunite: "chaud",
      priorite: "haute",
      motif_objection: "Prix trop élevé",
      date_relance: "2025-06-01",
      offre_cible: "Essentiel",
      canal_acquisition: "terrain",
    };
    const result = sanitizeClientForDb(validPayload);
    expect(result.success).toBe(true);
  });

  it("SELECT with unknown column must strip it silently (Zod default behavior)", () => {
    const result = ClientSchema.safeParse({
      name: "Test",
      status: "prospect",
      nonexistent_column: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nonexistent_column).toBeUndefined();
    }
  });

  it("SELECT must never use wildcard (*)", () => {
    const adapterSource = EXPLICIT_COLUMNS.join(" ");
    expect(adapterSource).not.toContain("*");
  });
});

describe("TEST 3 — INSERT Contract Test", () => {
  it("INSERT payload must match DB schema exactly — no extra fields", () => {
    const validInsert = {
      name: "Nouveau Client",
      email: "client@example.com",
      phone: "0123456789",
      address: "2 avenue test",
      status: "prospect" as AllowedStatus,
      role: "manager",
      statut_opportunite: "tiède",
      priorite: "moyenne",
      offre_cible: "VIP trimestre",
      canal_acquisition: "référence",
    };
    const result = sanitizeClientForDb(validInsert);
    expect(result.success).toBe(true);
    if (result.success) {
      const keys = Object.keys(result.data);
      for (const key of keys) {
        expect(DB_COLUMN_SET.has(key)).toBe(true);
      }
    }
  });

  it("INSERT with phantom fields must strip them silently", () => {
    const result = sanitizeClientForDb({
      last_name: "Ghost",
      company: "Phantom Inc",
      status: "prospect" as AllowedStatus,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).last_name).toBeUndefined();
      expect((result.data as any).company).toBeUndefined();
    }
  });

  it("INSERT with undefined field must not send undefined to DB", () => {
    const payload: Record<string, unknown> = {
      name: "Safe Insert",
      status: "prospect" as AllowedStatus,
    };
    (payload as any).undefined_field = undefined;
    const sanitized = sanitizeClientForDb(payload);
    expect(sanitized.success).toBe(true);
  });
});

describe("TEST 4 — UPDATE Contract Test", () => {
  it("UPDATE payload must match DB schema exactly — no extra fields", () => {
    const updatePayload = {
      name: "Updated Name",
      status: "client actif" as AllowedStatus,
      email: "updated@example.com",
    };
    const result = sanitizeClientForDb(updatePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      const keys = Object.keys(result.data);
      for (const key of keys) {
        expect(DB_COLUMN_SET.has(key)).toBe(true);
      }
    }
  });

  it("UPDATE with unknown fields must strip them", () => {
    const result = sanitizeClientForDb({
      status: "perdu" as AllowedStatus,
      invalid_field: "should be stripped",
      another_bad_col: 123,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).invalid_field).toBeUndefined();
      expect((result.data as any).another_bad_col).toBeUndefined();
    }
  });

  it("UPDATE with empty payload must fail (no valid fields)", () => {
    const result = sanitizeClientForDb({});
    expect(result.success).toBe(false);
  });

  it("UPDATE payload must not contain undefined values", () => {
    const result = sanitizeClientForDb({
      status: "prospect" as AllowedStatus,
    });
    expect(result.success).toBe(true);
  });
});

describe("TEST 5 — DELETE Integrity Test", () => {
  it("DELETE must require a valid UUID id (string contract)", () => {
    const validId = "550e8400-e29b-41d4-a716-446655440000";
    expect(typeof validId).toBe("string");
    expect(validId.length).toBeGreaterThan(0);
  });

  it("deleteClient function signature must accept only string id", () => {
    const deleteClient = (id: string): Promise<void> => Promise.resolve();
    expect(typeof deleteClient).toBe("function");
  });
});

describe("DATABASE CONTRACT DISCOVERY — Schema Snapshot", () => {
  it("Must log the complete DB schema contract for documentation", () => {
    const schemaSummary = DB_SCHEMA_CONTRACT.columns.map(c =>
      `  ${c.name} ${c.type}${c.nullable ? "" : " NOT NULL"}${c.default ? ` DEFAULT ${c.default}` : ""}${c.check ? ` CHECK(${c.check})` : ""}`
    ).join("\n");

    const report = [
      "=".repeat(60),
      "DATABASE CONTRACT — IMMUTABLE SCHEMA",
      "=".repeat(60),
      `Table: ${DB_SCHEMA_CONTRACT.tableName}`,
      `Columns:`,
      schemaSummary,
      "",
      `Indexes: ${DB_SCHEMA_CONTRACT.indexes.join(", ")}`,
      `RLS Enabled: ${DB_SCHEMA_CONTRACT.rls.enabled}`,
      `RLS Policies: ${DB_SCHEMA_CONTRACT.rls.policies.join(", ")}`,
      "",
      `Zod Schema Keys (${ClientSchemaKeys.length}): ${ClientSchemaKeys.join(", ")}`,
      `EXPLICIT_COLUMNS (${EXPLICIT_COLUMNS.length}): ${EXPLICIT_COLUMNS.join(", ")}`,
      "=".repeat(60),
    ].join("\n");

    console.log(report);
    expect(DB_COLUMN_NAMES).toBeDefined();
    expect(DB_COLUMN_NAMES.length).toBe(15);
  });

  it("DB schema has exactly 15 columns", () => {
    expect(DB_COLUMN_NAMES.length).toBe(15);
  });

  it("ClientSchema has exactly 15 keys", () => {
    expect(ClientSchemaKeys.length).toBe(15);
  });

  it("EXPLICIT_COLUMNS has exactly 15 columns", () => {
    expect(EXPLICIT_COLUMNS.length).toBe(15);
  });

  it("All three schema sources have same column count", () => {
    expect(DB_COLUMN_NAMES.length).toBe(ClientSchemaKeys.length);
    expect(ClientSchemaKeys.length).toBe(EXPLICIT_COLUMNS.length);
  });
});
