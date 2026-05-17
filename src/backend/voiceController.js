import express from 'express';
import { validateContact } from './validation/contactSchema.js';
import { buildProspectFromTranscript, findMatchByCompanyOrContact } from './voiceUtils.js';
import { computeLeadScore } from '../../server/leadScoreService.js';

export function createVoiceRouter(deps) {
  const { memoryDb, supabase, useMemoryStore, fetchClients } = deps;
  const router = express.Router();

  router.post('/ingest', async (req, res, next) => {
    try {
      const { transcript, confirm } = req.body || {};
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ success: false, error: 'Transcript is required' });
      }

      // Try to find existing match
      let existing = null;
      if (useMemoryStore) {
        const clients = memoryDb.listClients();
        existing = findMatchByCompanyOrContact(clients, transcript);
      } else {
        if (!fetchClients) {
          return res.status(500).json({ success: false, error: 'fetchClients not configured' });
        }
        const clients = await fetchClients({ minScore: 0, sortByScore: false, search: transcript });
        existing = findMatchByCompanyOrContact(clients || [], transcript);
      }

      if (existing) {
        const proposed = { ...existing };
        return res.status(200).json({
          success: true,
          status: 'existing',
          client: existing,
          proposedChanges: proposed,
        });
      }

      const { record, errors } = buildProspectFromTranscript(transcript);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, error: 'Validation failed', validationErrors: errors });
      }

      if (!confirm) {
        return res.status(200).json({ success: true, status: 'preview', proposed: record });
      }

      // compute lead score
      const leadScoreInput = {
        first_name: record.primaryContact?.name,
        last_name: record.company,
        phone: record.primaryContact?.phone,
        email: record.primaryContact?.email,
        status: record.status,
      };
      const lead_score = computeLeadScore(leadScoreInput);

      // ── Mapping strict vers Supabase clients (anti "champ fantôme") ──
      // ClientSchema/Supabase attend des clés snake_case type:
      // first_name, last_name, email, phone, company, address, postal_code, arrondissement,
      // contact, status, type_etablissement, role, statut_opportunite, priorite, notes, next_action, etc.
      // Ici, le record (voiceUtils) n’a pas exactement la même forme, donc on mappe
      // uniquement les champs sûrs et on drop tout inconnu.

      const CLIENT_KEYS_WHITELIST = [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "company",
        "address",
        "postal_code",
        "arrondissement",
        "contact",
        "status",
        "type_etablissement",
        "role",
        "statut_opportunite",
        "priorite",
        "motif_objection",
        "date_relance",
        "offre_cible",
        "canal_acquisition",
        "notes",
        "next_action",
        "date_created",
        "date_updated",
        "imported_at",
        "source_file",
        "enrichment_data",
        "business_description",
        "segmentation",
        "lead_score",
        "enriched_at",
        "metadata"
      ];

      const lastNameFromPrimary =
        (record.primaryContact && (record.primaryContact.name || record.primaryContact.phone)) ||
        record.company ||
        "Prospect";

      const firstNameGuess = (() => {
        const n = (record.primaryContact && record.primaryContact.name) || "";
        const parts = String(n).trim().split(/\s+/).filter(Boolean);
        return parts.length > 1 ? parts.slice(0, -1).join(" ") : null;
      })();

      const clientDataRaw = {
        company: record.company || null,
        address: record.address || null,
        postal_code: record.postalCode || null,
        status: record.status || "prospect",
        first_name: firstNameGuess,
        last_name: String(lastNameFromPrimary || "Prospect").trim(),

        // depuis voiceUtils on a seulement primaryContact.{name,phone,email,role?}
        contact: (record.primaryContact && record.primaryContact.phone) ? record.primaryContact.phone : null,
        role: (record.primaryContact && record.primaryContact.role) ? record.primaryContact.role : null,
        email: (record.primaryContact && record.primaryContact.email) ? record.primaryContact.email : null,
        phone: (record.primaryContact && record.primaryContact.phone) ? record.primaryContact.phone : null,

        // statut/opportunité : voiceUtils ne donne pas exactement ces clés;
        // on les laisse null plutôt que d’injecter un champ fantôme.
        statut_opportunite: null,
        priorite: null,

        notes: record.summary ? String(record.summary).slice(0, 3000) : String(transcript).slice(0, 3000),

        lead_score,

        metadata: { source: "voice_controller", transcript_len: String(transcript).length }
      };

      const clientData = Object.fromEntries(
        Object.entries(clientDataRaw).filter(([k]) => CLIENT_KEYS_WHITELIST.includes(k))
      );

      // Save
      if (useMemoryStore) {
        const created = memoryDb.insertClient(clientData);
        return res.status(201).json({ success: true, status: 'created', client: created });
      }

      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured' });
      }

      if (!deps.createClient) {
        return res.status(500).json({ success: false, error: 'createClient not configured' });
      }
      const created = await deps.createClient(clientData);
      return res.status(201).json({ success: true, status: 'created', client: created });
    } catch (error) {
      if (error.validationErrors) {
        return res.status(400).json({ success: false, error: 'Validation failed', validationErrors: error.validationErrors });
      }
      next(error);
    }
  });

  return router;
}
