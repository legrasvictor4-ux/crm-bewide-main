import { describe, it, expect } from "vitest";
import { contactRecordSchema } from "@/types/contact";

describe("contactRecordSchema", () => {
  it("accepts valid payload", () => {
    const parsed = contactRecordSchema.parse({
      company: "ACME",
      address: "1 rue",
      postalCode: "75000",
      city: "Paris",
      status: "prospect",
      opportunityScore: 5,
      primaryContact: { name: "Jean", role: "CEO", phone: "0102030405", email: "jean@example.com" },
    });
    expect(parsed.company).toBe("ACME");
  });

  it("rejects missing company", () => {
    const res = contactRecordSchema.safeParse({
      address: "1 rue",
      postalCode: "75000",
      city: "Paris",
      status: "prospect",
      primaryContact: { name: "Jean", role: "CEO", phone: "0102030405", email: "jean@example.com" },
    });
    expect(res.success).toBe(false);
  });
});
