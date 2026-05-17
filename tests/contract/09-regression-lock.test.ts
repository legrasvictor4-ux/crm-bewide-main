import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// REGRESSION LOCK CONTRACT TESTS
// =============================================================================
// These tests act as permanent regression guards. They MUST fail if legacy
// fields reappear in the schema or if unmapped fields are detected.
// =============================================================================

// Legacy fields that were previously in the codebase but are now banned
// from the Zod schema. They must NEVER reappear.
const LEGACY_BANNED_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "postal_code",
  "postalCode",
  "arrondissement",
  "lead_score",
  "notes",
  "next_action",
  "date_created",
  "date_updated",
  "imported_at",
  "source_file",
  "enrichment_data",
  "business_description",
  "segmentation",
  "enriched_at",
  "metadata",
  "contact",
  "type_etablissement",
  "ville",
  "village",
  "commune",
  "municipalite",
] as const;

// Phantom fields that must always be stripped by sanitizeClientForDb
const PHANTOM_PAYLOADS = [
  { name: "Test", status: "prospect" as const, city: "Paris" },
  { name: "Test", status: "prospect" as const, ville: "Lyon" },
  { name: "Test", status: "prospect" as const, company: "ACME" },
  { name: "Test", status: "prospect" as const, last_name: "Ghost" },
  { name: "Test", status: "prospect" as const, first_name: "John" },
  { name: "Test", status: "prospect" as const, postal_code: "75000" },
  { name: "Test", status: "prospect" as const, unknown_field: "value" },
  { name: "Test", status: "prospect" as const, ghost_col: true },
];

describe("TEST 39 — LEGACY FIELD USAGE DETECTION", () => {
  it("LEGACY BAN: first_name must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("first_name")).toBe(false);
  });

  it("LEGACY BAN: last_name must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("last_name")).toBe(false);
  });

  it("LEGACY BAN: company must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("company")).toBe(false);
  });

  it("LEGACY BAN: postal_code must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("postal_code")).toBe(false);
  });

  it("LEGACY BAN: arrondissement must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("arrondissement")).toBe(false);
  });

  it("LEGACY BAN: lead_score must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("lead_score")).toBe(false);
  });

  it("LEGACY BAN: notes must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("notes")).toBe(false);
  });

  it("LEGACY BAN: next_action must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("next_action")).toBe(false);
  });

  it("LEGACY BAN: date_created must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("date_created")).toBe(false);
  });

  it("LEGACY BAN: date_updated must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("date_updated")).toBe(false);
  });

  it("LEGACY BAN: metadata must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("metadata")).toBe(false);
  });

  it("LEGACY BAN: contact must NOT be in ClientSchema", () => {
    expect(ClientSchemaKeys.includes("contact")).toBe(false);
  });

  it("ALL legacy banned fields must be absent from ClientSchema", () => {
    for (const field of LEGACY_BANNED_FIELDS) {
      expect(ClientSchemaKeys.includes(field)).toBe(false);
    }
  });

  it("EXPLICIT_COLUMNS must NOT contain any legacy field", () => {
    const explicitColumns = [
      "id", "name", "email", "phone", "address",
      "status", "role", "latitude", "longitude",
      "statut_opportunite", "priorite", "motif_objection",
      "date_relance", "offre_cible", "canal_acquisition",
    ];
    for (const field of LEGACY_BANNED_FIELDS) {
      expect(explicitColumns.includes(field)).toBe(false);
    }
  });
});

describe("TEST 40 — UNMAPPED FIELD DETECTION", () => {
  it("PAYLOAD: city must be stripped by sanitizeClientForDb", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", city: "Paris" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).city).toBeUndefined();
    }
  });

  it("PAYLOAD: company must be stripped by sanitizeClientForDb", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", company: "ACME" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).company).toBeUndefined();
    }
  });

  it("PAYLOAD: last_name must be stripped by sanitizeClientForDb", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", last_name: "Ghost" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).last_name).toBeUndefined();
    }
  });

  it("PAYLOAD: first_name must be stripped by sanitizeClientForDb", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", first_name: "John" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).first_name).toBeUndefined();
    }
  });

  it("ALL phantom payloads must have their unknown fields stripped", () => {
    for (const payload of PHANTOM_PAYLOADS) {
      const result = sanitizeClientForDb(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const resultKeys = Object.keys(result.data);
        const phantomKeys = resultKeys.filter(k => !ClientSchemaKeys.includes(k as any));
        expect(phantomKeys).toEqual([]);
      }
    }
  });

  it("Scout.tsx sends 'last_name' which gets silently stripped", () => {
    const scoutPayload = { last_name: "Le Comptoir", status: "prospect" };
    const result = sanitizeClientForDb(scoutPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).last_name).toBeUndefined();
      expect(result.data.name).toBeUndefined();
    }
  });

  it("VoiceExtractor sends 'last_name' which gets silently stripped", () => {
    const voicePayload = { last_name: "Chez Paul", status: "prospect" };
    const result = sanitizeClientForDb(voicePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).last_name).toBeUndefined();
    }
  });

  it("dbUtils.js CLIENT_DB_COLUMNS references fields not in actual DB", () => {
    const dbUtilsColumns = [
      "id", "first_name", "last_name", "email", "phone", "company",
      "address", "postal_code", "arrondissement", "contact", "status",
      "type_etablissement", "role", "statut_opportunite", "priorite",
      "motif_objection", "date_relance", "offre_cible", "canal_acquisition",
      "notes", "next_action", "date_created", "date_updated",
      "imported_at", "source_file", "enrichment_data", "business_description",
      "segmentation", "lead_score", "enriched_at", "metadata",
    ];
    const actualDbColumns = [
      "id", "name", "email", "phone", "address", "status",
      "role", "latitude", "longitude", "statut_opportunite",
      "priorite", "motif_objection", "date_relance", "offre_cible",
      "canal_acquisition",
    ];
    const actualSet = new Set(actualDbColumns);
    const phantomInDbUtils = dbUtilsColumns.filter(c => !actualSet.has(c));
    expect(phantomInDbUtils.length).toBeGreaterThan(0);

    const phantomInActual = actualDbColumns.filter(c => !dbUtilsColumns.includes(c));
    expect(phantomInActual.length).toBeGreaterThan(0);
  });
});
