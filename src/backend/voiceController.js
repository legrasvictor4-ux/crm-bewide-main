import express from 'express';
import { validateContact } from './validation/contactSchema.js';
import { buildProspectFromTranscript, findMatchByCompanyOrContact } from './voiceUtils.js';
import { computeLeadScore } from '../../server/leadScoreService.js';

export function createVoiceRouter(deps) {
  const { memoryDb, supabase, useMemoryStore } = deps;
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
      } else if (supabase) {
        const { data, error } = await supabase.from('clients').select('*').limit(50);
        if (error) throw error;
        existing = findMatchByCompanyOrContact(data || [], transcript);
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

      const clientData = {
        company: record.company,
        address: record.address,
        postal_code: record.postalCode,
        city: record.city,
        status: record.status,
        client_since: record.clientSince || null,
        opportunity_score: record.opportunityScore || null,
        primary_contact: record.primaryContact,
        secondary_contact: record.secondaryContact || null,
        additional_contacts: record.additionalContacts || [],
        social: record.social || {},
        appointment: record.appointment || null,
        additional_appointments: record.additionalAppointments || [],
        lead_score,
      };

      // Save
      if (useMemoryStore) {
        const created = memoryDb.insertClient(clientData);
        return res.status(201).json({ success: true, status: 'created', client: created });
      }

      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('clients').insert(clientData).select().single();
      if (error) throw error;
      return res.status(201).json({ success: true, status: 'created', client: data });
    } catch (error) {
      if (error.validationErrors) {
        return res.status(400).json({ success: false, error: 'Validation failed', validationErrors: error.validationErrors });
      }
      next(error);
    }
  });

  return router;
}
