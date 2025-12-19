import { describe, expect, it } from 'vitest';
import { buildEventPrompt, parseEventFromTranscription } from '../../src/backend/timeline/aiParser.js';

describe('aiParser', () => {
  it('parses structured data and normalizes fields', async () => {
    const stubCall = async ({ prompt }) => {
      expect(prompt).toContain('Voice transcription:');
      return JSON.stringify({
        event_type: 'visit',
        contact_name: 'Sam',
        interest_level: 'HIGH',
        next_action: { type: 'call', date_suggestion: '2025-12-23' },
        signals: ['uses_instagram'],
        blocking_points: [],
        confidence_score: 0.82,
      });
    };

    const result = await parseEventFromTranscription('Met Sam at the shop, seems interested', {
      callModel: stubCall,
      apiKey: 'test-key',
    });

    expect(result.event_type).toBe('visit');
    expect(result.structured_data.interest_level).toBe('high');
    expect(result.structured_data.next_action.type).toBe('call');
  });

  it('handles fenced code blocks and falls back to note for unknown event types', async () => {
    const stubCall = async () => '```json\n{"event_type":"random","signals":[],"blocking_points":[]}\n```';
    const result = await parseEventFromTranscription('Random note', { callModel: stubCall, apiKey: 'test-key' });
    expect(result.event_type).toBe('note');
    expect(result.structured_data.signals).toEqual([]);
  });

  it('builds a prompt that forbids hallucinations', () => {
    const prompt = buildEventPrompt('Call with client');
    expect(prompt).toContain('Do not invent data');
    expect(prompt).toContain('event_type');
  });
});
