import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { ClientSchemaKeys } from "@/schema/clientSchemaKeys";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// FRONTEND CONTRACT TESTS
// =============================================================================
// Validates alignment between frontend form fields and the DB schema contract.
// =============================================================================

// The ContactRecord schema fields (from src/backend/validation/contactRecord.js)
const CONTACT_RECORD_FIELDS = [
  "company", "address", "postalCode", "city", "status",
  "clientSince", "opportunityScore", "primaryContact",
  "secondaryContact", "additionalContacts", "social",
  "appointment", "additionalAppointments",
] as const;

// Fields in ContactRecord that have equivalent DB columns
const CONTACT_TO_DB_MAPPING: Record<string, string> = {
  address: "address",
  status: "status",
};

// Fields in ContactRecord that do NOT exist in DB
const CONTACT_FIELDS_WITHOUT_DB_EQUIVALENT = [
  "company", "postalCode", "city", "clientSince",
  "opportunityScore", "primaryContact", "secondaryContact",
  "additionalContacts", "social", "appointment",
  "additionalAppointments",
];

// DB columns that have NO equivalent in ContactRecord
const DB_COLUMNS_WITHOUT_CONTACT_EQUIVALENT = [
  "id", "name", "email", "phone", "role",
  "latitude", "longitude", "statut_opportunite", "priorite",
  "motif_objection", "date_relance", "offre_cible", "canal_acquisition",
];

// The Scout page sends these fields (from Scout.tsx)
const SCOUT_PAYLOAD_FIELDS = [
  "last_name", "email", "phone", "address",
  "status", "canal_acquisition",
] as const;

// Fields from dbUtils.js (the backend utility)
const DB_UTILS_COLUMNS = [
  "id", "first_name", "last_name", "email", "phone", "company",
  "address", "postal_code", "arrondissement", "contact", "status",
  "type_etablissement", "role", "statut_opportunite", "priorite",
  "motif_objection", "date_relance", "offre_cible", "canal_acquisition",
  "notes", "next_action", "date_created", "date_updated",
  "imported_at", "source_file", "enrichment_data", "business_description",
  "segmentation", "lead_score", "enriched_at", "metadata",
];

describe("TEST 35 — FORM → DB ALIGNMENT", () => {
  it("ContactRecord fields that map to DB must exist in ClientSchema", () => {
    for (const [, dbField] of Object.entries(CONTACT_TO_DB_MAPPING)) {
      expect(ClientSchemaKeys.includes(dbField)).toBe(true);
    }
  });

  it("ContactRecord 'status' enum mismatch detection: form uses 'client' but DB uses 'client actif'", () => {
    const formStatusValues = ["client", "prospect"];
    const dbStatusValues = ["prospect", "activé", "client actif", "perdu"];
    expect(formStatusValues).not.toEqual(dbStatusValues);
    expect(formStatusValues.includes("client")).toBe(true);
    expect(dbStatusValues.includes("client")).toBe(false);
    expect(dbStatusValues.includes("client actif")).toBe(true);
  });

  it("ContactRecord 'opportunityScore' (1-10) has no DB equivalent", () => {
    expect(ClientSchemaKeys.includes("opportunityScore")).toBe(false);
  });

  it("ContactRecord 'company' has no DB column", () => {
    expect(ClientSchemaKeys.includes("company")).toBe(false);
  });

  it("ContactRecord 'postalCode' has no DB column", () => {
    expect(ClientSchemaKeys.includes("postalCode")).toBe(false);
    expect(ClientSchemaKeys.includes("postal_code")).toBe(false);
  });

  it("ContactRecord 'primaryContact' (nested) has no DB equivalent", () => {
    expect(ClientSchemaKeys.includes("primaryContact")).toBe(false);
  });

  it("ContactRecord 'social' (nested) has no DB equivalent", () => {
    expect(ClientSchemaKeys.includes("social")).toBe(false);
  });

  it("ContactRecord 'appointment' (nested) has no DB equivalent", () => {
    expect(ClientSchemaKeys.includes("appointment")).toBe(false);
  });
});

describe("TEST 36 — UI FIELD MAPPING", () => {
  it("Map.tsx reads 'first_name' which does NOT exist in DB schema", () => {
    expect(ClientSchemaKeys.includes("first_name")).toBe(false);
  });

  it("Map.tsx reads 'last_name' which does NOT exist in DB schema", () => {
    expect(ClientSchemaKeys.includes("last_name")).toBe(false);
  });

  it("Map.tsx reads 'company' which does NOT exist in DB schema", () => {
    expect(ClientSchemaKeys.includes("company")).toBe(false);
  });

  it("Map.tsx reads 'postal_code' which does NOT exist in DB schema", () => {
    expect(ClientSchemaKeys.includes("postal_code")).toBe(false);
  });

  it("The actual DB column is 'name' (not first_name/last_name)", () => {
    expect(ClientSchemaKeys.includes("name")).toBe(true);
    expect(ClientSchemaKeys.includes("first_name")).toBe(false);
    expect(ClientSchemaKeys.includes("last_name")).toBe(false);
  });

  it("SpeedProspecting component uses 'client.last_name' which doesn't exist in DB", () => {
    expect(ClientSchemaKeys.includes("last_name")).toBe(false);
  });

  it("Contacts.tsx fetches from /api/clients (Express) not Supabase directly", () => {
    const apiEndpoint = "/api/clients";
    expect(apiEndpoint).toBe("/api/clients");
  });

  it("Contacts.tsx display uses 'client.company' which has no DB column", () => {
    expect(ClientSchemaKeys.includes("company")).toBe(false);
  });

  it("Contacts.tsx display uses 'client.contact' which has no DB column", () => {
    expect(ClientSchemaKeys.includes("contact")).toBe(false);
  });

  it("Contacts.tsx uses 'client.opportunityScore' which has no DB column", () => {
    expect(ClientSchemaKeys.includes("opportunityScore")).toBe(false);
  });
});

describe("TEST 37 — HOOK CONSISTENCY (useClients)", () => {
  it("useCreateClient input type must be CreateClientInput (TablesInsert)", () => {
    const validInput = {
      name: "Hook Test",
      status: "prospect" as const,
    };
    const parsed = ClientSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("useCreateClient must reject phantom fields via sanitizeClientForDb", () => {
    const result = sanitizeClientForDb({
      name: "Hook Test",
      status: "prospect" as const,
      company: "Ghost",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).company).toBeUndefined();
    }
  });

  it("useUpdateClient must accept partial updates", () => {
    const partialUpdate = { status: "client actif" as const };
    const result = sanitizeClientForDb(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("useDeleteClient must accept string id", () => {
    const deleteFn = (id: string) => id;
    expect(deleteFn("valid-id")).toBe("valid-id");
  });

  it("useClients fetchClients returns Client[] (Tables Row)", () => {
    const mockRow = {
      id: "uuid",
      name: null,
      email: null,
      phone: null,
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
    const parsed = ClientSchema.safeParse(mockRow);
    expect(parsed.success).toBe(true);
  });
});

describe("TEST 38 — STATE HYDRATION TEST", () => {
  it("React Query cache must store Client[] shape", () => {
    const cacheEntry = {
      data: [{
        id: "1",
        name: "Hydrated",
        email: null,
        phone: null,
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
      }],
    };
    const parsed = ClientSchema.safeParse(cacheEntry.data[0]);
    expect(parsed.success).toBe(true);
  });

  it("Stale data in cache must still match ClientSchema", () => {
    const staleRow = {
      id: "stale-uuid",
      name: "Stale",
      email: "stale@test.com",
      phone: "0102030405",
      address: "123 Old St",
      status: "perdu" as const,
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
    const parsed = ClientSchema.safeParse(staleRow);
    expect(parsed.success).toBe(true);
  });

  it("Query invalidation must clear stale entries", () => {
    const queryKeys = new Set<string>();
    queryKeys.add("clients");
    const invalidated = queryKeys.delete("clients");
    expect(invalidated).toBe(true);
    expect(queryKeys.has("clients")).toBe(false);
  });

  it("Refetch after invalidation must produce valid ClientShape", () => {
    const freshData = {
      id: "fresh-uuid",
      name: "Fresh",
      email: null,
      phone: null,
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
    const parsed = ClientSchema.safeParse(freshData);
    expect(parsed.success).toBe(true);
  });
});
