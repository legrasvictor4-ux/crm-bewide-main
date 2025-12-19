import express from 'express';
import { evaluateNotifications } from './engine.js';

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
          .select('*')
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
