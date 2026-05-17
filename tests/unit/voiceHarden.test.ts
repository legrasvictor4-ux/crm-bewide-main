import { describe, it, expect } from 'vitest';
import {
  voiceMachineReducer, ALLOWED_TRANSITIONS,
} from '@/lib/voice/voiceWorkflowMachine';
import { appendTranscript, getTranscript, resetTranscriptStore } from '@/lib/voice/voiceTranscriptStore';

const IDLE = { step: 'IDLE' as const, transcript: '', payload: null, error: null, canRetry: true, timestamp: 0 };

describe('Voice Unit — pur, offline, sans dépendance DOM', () => {
  it('machine d\'état : toutes les transitions ALLOWED sont valides sans crash', () => {
    for (const [from, events] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const eventType of events) {
        const s = { ...IDLE, step: from as any };
        const r = voiceMachineReducer(s, { type: eventType } as any);
        expect(r).toBeDefined();
      }
    }
  });

  it('transcript store : versionne correctement', () => {
    resetTranscriptStore();
    appendTranscript('Hello', true);
    appendTranscript('World', true);
    expect(getTranscript()).toBe('Hello World');
  });

  it('transcript store : ignore non-final', () => {
    resetTranscriptStore();
    appendTranscript('Hello', false);
    expect(getTranscript()).toBe('');
  });
});
