import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { deriveAccountState, scoreFromEvent } from '../../src/backend/timeline/stateRules.js';

const baseAccount = {
  id: 'acc-1',
  name: 'Test Account',
  lead_score: 20,
  closing_probability: 15,
  current_status: 'new',
  last_interaction_at: null,
  next_action_at: null,
};

describe('stateRules', () => {
  it('boosts lead_score when last two events show interest', () => {
    const events = [
      { event_type: 'visit', structured_data: { interest_level: 'high' }, created_at: new Date().toISOString() },
      { event_type: 'email', structured_data: { interest_level: 'medium' }, created_at: dayjs().subtract(1, 'day').toISOString() },
    ];
    const updated = deriveAccountState(baseAccount, events);
    expect(updated.lead_score).toBeGreaterThan(baseAccount.lead_score);
    expect(updated.current_status).toBe('engaged');
  });

  it('moves account to cooling after 14 days without interactions', () => {
    const events = [
      { event_type: 'note', structured_data: {}, created_at: dayjs().subtract(16, 'day').toISOString() },
    ];
    const updated = deriveAccountState(baseAccount, events);
    expect(updated.current_status).toBe('cooling');
  });

  it('raises closing probability on demo and deal events', () => {
    const demoEvent = { event_type: 'demo', structured_data: { interest_level: 'high' }, created_at: new Date().toISOString() };
    const updatedDemo = deriveAccountState(baseAccount, [demoEvent]);
    expect(updatedDemo.closing_probability).toBeGreaterThanOrEqual(60);

    const dealEvent = { event_type: 'deal', structured_data: { interest_level: 'high' }, created_at: new Date().toISOString() };
    const updatedDeal = deriveAccountState(baseAccount, [dealEvent]);
    expect(updatedDeal.closing_probability).toBeGreaterThanOrEqual(80);
  });

  it('penalizes lead score when blockers are present', () => {
    const event = {
      event_type: 'call',
      structured_data: { interest_level: 'medium', blocking_points: ['decision_maker_absent'] },
      created_at: new Date().toISOString(),
    };
    const score = scoreFromEvent(event);
    expect(score).toBeLessThan(8); // medium interest baseline (8) minus blocker penalty
  });
});
