import { parseEventFromTranscription } from './aiParser.js';
import { deriveAccountState } from './stateRules.js';

export async function createTimelineEvent(payload, deps) {
  const { repository } = deps;
  if (!repository) throw new Error('repository is required');

  const {
    accountId,
    accountName,
    raw_input_text,
    created_by = null,
    structured_data = null,
    event_type = null,
  } = payload;

  if (!raw_input_text) {
    throw new Error('raw_input_text is required');
  }

  // Parse voice transcription into structured data if not provided
  const parsed =
    structured_data && event_type
      ? { structured_data, event_type }
      : await parseEventFromTranscription(raw_input_text, deps.aiOptions || {});

  const existingAccount = accountId ? await repository.getAccount(accountId) : null;

  const account = existingAccount
    ? existingAccount
    : await repository.createAccount({
        name: accountName || 'Prospect',
        category: null,
        city: null,
        current_status: 'new',
        lead_score: 0,
        closing_probability: 0,
        last_interaction_at: null,
        next_action_at: null,
        ai_summary_short: null,
      });

  const createdEvent = await repository.insertEvent({
    account_id: account.id,
    event_type: parsed.event_type,
    raw_input_text,
    structured_data: parsed.structured_data,
    created_by,
  });

  const events = await repository.listEvents(account.id, { limit: 200 });
  const allEvents = [createdEvent, ...events].filter(
    (evt, index, arr) => arr.findIndex((candidate) => candidate.id === evt.id) === index
  );
  const updatedState = deriveAccountState(account, allEvents);

  const updatedAccount = await repository.updateAccount(account.id, {
    current_status: updatedState.current_status,
    lead_score: updatedState.lead_score,
    closing_probability: updatedState.closing_probability,
    last_interaction_at: updatedState.last_interaction_at,
    next_action_at: updatedState.next_action_at,
  });

  return {
    account: updatedAccount,
    event: createdEvent,
  };
}
