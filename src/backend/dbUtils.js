// Colonnes autorisées pour toute opération sur la table clients
// (doit correspondre exactement au schéma Supabase + ClientSchema Zod)
export const CLIENT_DB_COLUMNS = [
  "id", "first_name", "last_name", "email", "phone", "company",
  "address", "postal_code", "arrondissement", "contact", "status",
  "type_etablissement", "role", "statut_opportunite", "priorite",
  "motif_objection", "date_relance", "offre_cible", "canal_acquisition",
  "notes", "next_action", "date_created", "date_updated",
  "imported_at", "source_file", "enrichment_data", "business_description",
  "segmentation", "lead_score", "enriched_at", "metadata",
];

export const CLIENT_SELECT_COLUMNS = CLIENT_DB_COLUMNS.join(", ");

/**
 * Filtre un objet pour ne garder que les colonnes autorisées.
 * En dev, logge les clés rejetées.
 */
export function whitelistClientRecord(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  const rejected = [];
  for (const k of Object.keys(obj)) {
    if (CLIENT_DB_COLUMNS.includes(k)) {
      out[k] = obj[k];
    } else {
      rejected.push(k);
    }
  }
  if (rejected.length > 0) {
    console.warn("[DB_UTILS] Colonnes rejetées:", rejected);
  }
  return out;
}

/**
 * Whitelist + parse numérique pour lead_score.
 */
export function sanitizeClientPayload(payload) {
  const clean = whitelistClientRecord(payload);
  if (clean.lead_score !== undefined && clean.lead_score !== null) {
    clean.lead_score = Number(clean.lead_score);
    if (Number.isNaN(clean.lead_score)) {
      delete clean.lead_score;
    }
  }
  return clean;
}
