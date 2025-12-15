import { describe, it, expect } from "vitest";
import { extractFieldsFromTranscript, buildProspectFromTranscript, findMatchByCompanyOrContact } from "@/backend/voiceUtils";

describe("voiceUtils", () => {
  it("extracts key fields from transcript", () => {
    const t = "Bonjour, mon entreprise est ACME et mon email est jean@example.com, téléphone +33 6 12 34 56 78";
    const res = extractFieldsFromTranscript(t);
    expect(res.company).toBe("ACME");
    expect(res.primaryContact?.email).toBe("jean@example.com");
    expect(res.primaryContact?.phone).toContain("33");
  });

  it("builds prospect from transcript", () => {
    const { record, errors } = buildProspectFromTranscript("Je suis Marie de BetaCorp, 0102030405 marie@beta.com");
    expect(errors.length).toBe(0);
    expect(record.company).toBeDefined();
    expect(record.primaryContact.name).toBeDefined();
  });

  it("finds existing by company or contact", () => {
    const clients = [
      { company: "ACME", primary_contact: { name: "Jean", email: "j@example.com" } },
      { company: "Other", primary_contact: { name: "Luc", email: "luc@example.com" } },
    ];
    const found = findMatchByCompanyOrContact(clients, "ACME");
    expect(found?.company).toBe("ACME");
    const foundByEmail = findMatchByCompanyOrContact(clients, "luc@example.com");
    expect(foundByEmail?.company).toBe("Other");
  });
});
