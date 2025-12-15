import { contactRecordSchema } from "../types/contact.js";

export function extractFieldsFromTranscript(transcript) {
  const nameMatch = transcript.match(/(?:je suis|moi c'est|name is)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
  const companyMatch = transcript.match(/(?:company|entreprise|société)\s+([A-Za-z0-9&\s]+)/i);
  const phoneMatch = transcript.match(/(\+?\d[\d\s]{6,})/);
  const emailMatch = transcript.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/);

  return {
    company: companyMatch?.[1]?.trim(),
    primaryContact: {
      name: nameMatch?.[1]?.trim(),
      phone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
      email: emailMatch?.[0]?.trim(),
      role: "Contact",
    },
  };
}

export function findMatchByCompanyOrContact(clients, needle) {
  const lower = needle.toLowerCase();
  return clients.find(
    (c) =>
      c.company?.toLowerCase() === lower ||
      c.primary_contact?.name?.toLowerCase() === lower ||
      c.primary_contact?.email?.toLowerCase() === lower
  );
}

export function buildProspectFromTranscript(transcript, defaults = {}) {
  const extracted = extractFieldsFromTranscript(transcript);
  const base = {
    company: extracted.company || "Prospect",
    address: defaults.address || "",
    postalCode: defaults.postalCode || "",
    city: defaults.city || "",
    status: "prospect",
    opportunityScore: 5,
    primaryContact: {
      name: extracted.primaryContact.name || "Contact",
      role: extracted.primaryContact.role,
      phone: extracted.primaryContact.phone || "",
      email: extracted.primaryContact.email || "",
    },
  };
  const parsed = contactRecordSchema.safeParse(base);
  if (!parsed.success) {
    return { record: base, errors: parsed.error.issues.map((i) => i.message) };
  }
  return { record: parsed.data, errors: [] };
}
