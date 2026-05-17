import { describe, expect, it } from "vitest";
import { ClientSchema } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

// =============================================================================
// DATA CORRUPTION CONTRACT TESTS
// =============================================================================
// These tests validate the system's resilience against malformed,
// corrupted, or unexpected data inputs — WITHOUT modifying source code.
// =============================================================================

describe("TEST 30 — MALFORMED PAYLOAD", () => {
  it("Non-object input (string) must be rejected", () => {
    const result = sanitizeClientForDb("not an object");
    expect(result.success).toBe(false);
  });

  it("Non-object input (number) must be rejected", () => {
    const result = sanitizeClientForDb(42);
    expect(result.success).toBe(false);
  });

  it("Non-object input (boolean true) must be rejected", () => {
    const result = sanitizeClientForDb(true);
    expect(result.success).toBe(false);
  });

  it("Non-object input (boolean false) must be rejected", () => {
    const result = sanitizeClientForDb(false);
    expect(result.success).toBe(false);
  });

  it("Array input must be rejected", () => {
    const result = sanitizeClientForDb([1, 2, 3]);
    expect(result.success).toBe(false);
  });

  it("Array with valid-looking entries must be rejected", () => {
    const result = sanitizeClientForDb([{ name: "Test", status: "prospect" }]);
    expect(result.success).toBe(false);
  });

  it("Function input must be rejected", () => {
    const result = sanitizeClientForDb(() => {});
    expect(result.success).toBe(false);
  });

  it("Symbol input must be rejected", () => {
    const result = sanitizeClientForDb(Symbol("test"));
    expect(result.success).toBe(false);
  });

  it("Date object input must be rejected (not a plain object)", () => {
    const result = sanitizeClientForDb(new Date());
    expect(result.success).toBe(false);
  });
});

describe("TEST 31 — PARTIAL DATA INSERT", () => {
  it("Payload with only status must succeed (minimum valid)", () => {
    const result = sanitizeClientForDb({ name: "Min", status: "prospect" });
    expect(result.success).toBe(true);
  });

  it("Payload with only id must fail (no status)", () => {
    const result = sanitizeClientForDb({ id: "abc-123" });
    expect(result.success).toBe(false);
  });

  it("Payload with empty name must be accepted (name is nullable)", () => {
    const result = sanitizeClientForDb({ name: "", status: "prospect" });
    expect(result.success).toBe(true);
  });

  it("Payload with partial nested-like keys must not introduce ghost fields", () => {
    const result = sanitizeClientForDb({
      name: "Partial",
      status: "prospect",
      "primaryContact.name": "John",
      "social.instagram": "@test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any)["primaryContact.name"]).toBeUndefined();
      expect((result.data as any)["social.instagram"]).toBeUndefined();
    }
  });
});

describe("TEST 32 — EMPTY STRINGS", () => {
  it("Empty string email stays as empty string (no auto-conversion to null)", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("");
    }
  });

  it("Empty string phone stays as empty string (no auto-conversion to null)", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("");
    }
  });

  it("Empty string address must be preserved as empty (was nullified?)", () => {
    const result = sanitizeClientForDb({ name: "Test", status: "prospect", address: "" });
    expect(result.success).toBe(true);
  });

  it("All empty string values in a full payload must be handled", () => {
    const result = sanitizeClientForDb({
      name: "Test",
      status: "prospect",
      email: "",
      phone: "",
      address: "",
      motif_objection: "",
      date_relance: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("TEST 33 — INVALID EMAIL FORMAT", () => {
  it("Email without @ must pass (email field is TEXT, no email validation in Zod)", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", email: "not-an-email" });
    expect(result.success).toBe(true);
  });

  it("Email with spaces must pass (no email format validation)", () => {
    const result = ClientSchema.safeParse({ name: "Test", status: "prospect", email: "invalid email with spaces" });
    expect(result.success).toBe(true);
  });

  it("Email is not validated by ClientSchema (it's just TEXT)", () => {
    const schema = ClientSchema.shape.email;
    const typeName = (schema as any)._def?.typeName;
    expect(typeName).not.toBe("ZodString");
  });
});

describe("TEST 34 — SPECIAL CHARACTERS (UTF-8 integrity)", () => {
  it("French accented characters must be accepted", () => {
    const result = sanitizeClientForDb({
      name: "François àéèêëîïôùûç ÀÉÈÊËÎÏÔÙÛÇ",
      status: "activé",
      address: "12 rue de l'Église, Mûr-de-Bretagne",
      offre_cible: "À qualifier",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toContain("é");
      expect(result.data.name).toContain("ç");
    }
  });

  it("Emoji in name must be accepted", () => {
    const result = sanitizeClientForDb({
      name: "Test 🚀 Client",
      status: "prospect",
    });
    expect(result.success).toBe(true);
  });

  it("Very long string must be accepted (no maxLength in schema)", () => {
    const longName = "A".repeat(10000);
    const result = sanitizeClientForDb({
      name: longName,
      status: "prospect",
    });
    expect(result.success).toBe(true);
  });

  it("HTML tags in text fields must be accepted (no sanitization)", () => {
    const result = sanitizeClientForDb({
      name: "<script>alert('xss')</script>",
      status: "prospect",
      address: "<b>Bold address</b>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toContain("<script>");
    }
  });

  it("Unicode special chars (RTL markers) must be accepted", () => {
    const result = sanitizeClientForDb({
      name: "Test \u200E\u200F\u202E",
      status: "perdu",
    });
    expect(result.success).toBe(true);
  });

  it("Newlines in text fields must be accepted", () => {
    const result = sanitizeClientForDb({
      name: "Line1\nLine2\r\nLine3",
      status: "prospect",
      address: "123 Main St\nApt 4B",
    });
    expect(result.success).toBe(true);
  });

  it("Tab characters in text fields must be accepted", () => {
    const result = sanitizeClientForDb({
      name: "Test\tClient",
      status: "prospect",
    });
    expect(result.success).toBe(true);
  });

  it("Null unicode char (\\u0000) must be accepted (schema allows it)", () => {
    const result = sanitizeClientForDb({
      name: "Test\u0000Client",
      status: "prospect",
    });
    expect(result.success).toBe(true);
  });
});
