import express from 'express';
import { createTimelineEvent } from './service.js';
import { deriveAccountState } from './stateRules.js';

export function createTimelineRouter({ repository, aiOptions = {} }) {
  const router = express.Router();

  router.post('/accounts/:accountId/events', async (req, res, next) => {
    try {
      const { accountId } = req.params;
      const { raw_input_text, created_by, structured_data, event_type } = req.body || {};

      const result = await createTimelineEvent(
        { accountId, raw_input_text, created_by, structured_data, event_type },
        { repository, aiOptions }
      );

      return res.status(201).json({
        success: true,
        event: result.event,
        account: result.account,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/voice', async (req, res, next) => {
    try {
      const { accountId, accountName, raw_input_text, created_by } = req.body || {};
      const result = await createTimelineEvent(
        { accountId, accountName, raw_input_text, created_by },
        { repository, aiOptions }
      );

      return res.status(201).json({
        success: true,
        status: accountId ? 'updated' : 'created',
        event: result.event,
        account: result.account,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/accounts/:accountId/events', async (req, res, next) => {
    try {
      const { accountId } = req.params;
      const events = await repository.listEvents(accountId, { limit: parseInt(req.query.limit || '50', 10) });
      return res.status(200).json({ success: true, events });
    } catch (error) {
      next(error);
    }
  });

  router.get('/accounts/:accountId/state', async (req, res, next) => {
    try {
      const { accountId } = req.params;
      const account = await repository.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      const events = await repository.listEvents(accountId, { limit: 200 });
      const state = deriveAccountState(account, events);
      return res.status(200).json({ success: true, account: state, eventsCount: events.length });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
