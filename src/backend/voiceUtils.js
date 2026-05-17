import { contactRecordSchema } from "./validation/contactRecord.js";

export function extractFieldsFromTranscript(transcript) {
  const t = String(transcript ?? "");

  // Ex: "Bonjour, mon entreprise est ACME et mon email est jean@..."
  // => on capture uniquement le token entreprise/company, sans le reste (email/et/phone...)
  const companyMatch =
    t.match(/(?:company|entreprise|société)\s+(?:est\s+)?([A-Za-z0-9&]+)\b/i) ??
    t.match(/(?:de\s+)([A-Za-z0-9&]+)\b/i); // fallback: "Je suis Marie de BetaCorp ..."

  // Ex: "Je suis Marie ..." => "Marie"
  const nameMatch =
    t.match(/(?:je suis|moi c'est|name is)\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)\b/i) ??
    t.match(/(?:je suis|moi c'est|name is)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s+(?:de|dans)\s+[A-Za-z0-9&]+|\s*,|$)/i);

  const phoneMatch = t.match(/(\+?\d[\d\s]{6,})/);
  const emailMatch = t.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/);

  return {
    company: companyMatch?.[1]?.trim() ?? "",
    primaryContact: {
      name: nameMatch?.[1]?.trim() ?? "",
      phone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "",
      email: emailMatch?.[0]?.trim() ?? "",
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

  // contactRecordSchema exige address (min 1) et postalCode (min 2)
  const address = (defaults.address ?? "").trim() || "Adresse inconnue";
  const postalCode = (defaults.postalCode ?? "").trim() || "00";
  const city = (defaults.city ?? "").trim() || "Ville inconnue";

  const base = {
    company: extracted.company || "Prospect",
    address,
    postalCode,
    city,
    status: "prospect",
    opportunityScore: 5,
    primaryContact: {
      name: extracted.primaryContact.name || "Contact",
      role: extracted.primaryContact.role || "Contact",
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
