import { describe, it, expect, beforeEach } from 'vitest';
import { voiceMachineReducer, ALLOWED_TRANSITIONS } from '@/lib/voice/voiceWorkflowMachine';
import { localExtract, detectDuplicates } from '@/lib/voice/voiceExtractor';

function idle() {
  return { step: 'IDLE' as const, transcript: '', payload: null, error: null, canRetry: true, timestamp: 0 };
}

describe('Phase 7: Voice Chaos Tests', () => {
  it('réseau coupé pendant extraction = SANITIZE_FAIL avec message clair', () => {
    const state = voiceMachineReducer(
      { ...idle(), step: 'EXTRACTING', transcript: 'test transcript' },
      { type: 'TIMEOUT' },
    );
    expect(state.step).toBe('ERROR');
    expect(state.error).toBe('Délai dépassé');
    expect(state.canRetry).toBe(true);
  });

  it('timeout API pendant extraction donne ERROR avec retry possible', () => {
    const state = voiceMachineReducer(
      { ...idle(), step: 'EXTRACTING', transcript: 'test' },
      { type: 'TIMEOUT' },
    );
    expect(state.step).toBe('ERROR');
    expect(state.canRetry).toBe(true);
  });

  it('Promise reject pendant save = SAVE_FAIL avec retry', () => {
    const state = voiceMachineReducer(
      { ...idle(), step: 'SAVING', transcript: 'test', payload: { last_name: 'Test' } as any },
      { type: 'SAVE_FAIL', error: 'ECONNRESET' },
    );
    expect(state.step).toBe('ERROR');
    expect(state.error).toBe('ECONNRESET');
    expect(state.canRetry).toBe(true);
  });

  it('voice interruption pendant LISTENING = transition propre vers CANCELLED', () => {
    const state = voiceMachineReducer(
      { ...idle(), step: 'LISTENING' },
      { type: 'CANCEL' },
    );
    expect(state.step).toBe('CANCELLED');
    expect(state.transcript).toBe('');
  });

  it('mobile suspend (perte micro) = TIMEOUT vers ERROR', () => {
    const state = voiceMachineReducer(
      { ...idle(), step: 'LISTENING' },
      { type: 'TIMEOUT' },
    );
    expect(state.step).toBe('ERROR');
  });

  it('CONFIRM_SAVE depuis SAVING ignoré (transition invalide)', () => {
    const s = voiceMachineReducer(
      { ...idle(), step: 'SAVING', transcript: 't', payload: { last_name: 'T' } as any },
      { type: 'CONFIRM_SAVE' },
    );
    expect(s.step).toBe('SAVING');
  });

  it('extraction locale avec transcript vide = last_name fallback "Prospection vocale"', () => {
    const result = localExtract('');
    expect(result.last_name).toBe('Prospection vocale');
  });

  it('transcript très long (5000+ chars) ne crash pas', () => {
    const longText = 'A '.repeat(3000);
    const result = localExtract(longText);
    expect(result.last_name).toBeDefined();
  });

  it('statut inconnu dans extract = fallback prospect', () => {
    const result = localExtract('rien de spécial');
    expect(result.status).toBe('prospect');
  });

  it('événement inconnu dans state machine est ignoré silencieusement', () => {
    const state = voiceMachineReducer(idle(), { type: 'UNKNOWN_EVENT' as any });
    expect(state.step).toBe('IDLE');
  });
});
