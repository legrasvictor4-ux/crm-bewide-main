import express from 'express';
import { evaluateNotifications } from './engine.js';

/**
 * Colonnes explicites utilisÃ©es par evaluateNotifications().
 * INTERDIT: .select('*') pour Ã©viter toute fuite de champs inconnus.
 */
const NOTIF_CLIENT_COLUMNS = `
  id,
  last_name,
  first_name,
  company,
  status,
  statut_opportunite,
  priorite,
  date_relance,
  next_action,
  date_created,
  date_updated,
  lead_score
`;

export function createNotificationRouter(deps) {
  const { supabase, memoryDb, useMemoryStore } = deps;
  const router = express.Router();

  router.get('/daily', async (req, res, next) => {
    try {
      let clients = [];
      if (useMemoryStore) {
        clients = memoryDb ? memoryDb.listClients({ status: 'all', limit: 200, offset: 0 }) : [];
      } else if (supabase) {
        const { data, error } = await supabase
          .from('clients')
          .select(NOTIF_CLIENT_COLUMNS)
          .order('date_updated', { ascending: false })
          .limit(200);
        if (error) throw error;
        clients = data || [];
      }

      const notifications = evaluateNotifications(clients, {});
      return res.json({ success: true, notifications });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
