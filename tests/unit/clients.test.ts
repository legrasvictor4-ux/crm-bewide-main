import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildClient } from '../../tests/factories/clientFactory';
import { VALID_CLIENT_PAYLOAD, TRANSCRIPT_SAMPLE, EXISTING_CLIENTS } from '../../tests/fixtures/clientFixtures';
import { sanitizeClientForDb } from '@/schema/sanitizeClient';
import { localExtract, detectDuplicates } from '@/lib/voice/voiceExtractor';

describe('Purified Unit Tests — offline, no network, no Supabase', () => {
  it('factory produit un client valide', () => {
    const c = buildClient({ last_name: 'Dupont' });
    expect(c.last_name).toBe('Dupont');
    expect(c.id).toMatch(/^client-/);
  });

  it('fixture VALID_CLIENT_PAYLOAD passe sanitize', () => {
    const result = sanitizeClientForDb(VALID_CLIENT_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('localExtract — offline, pure function', () => {
    const r = localExtract(TRANSCRIPT_SAMPLE);
    expect(r.last_name).toBeTruthy();
  });

  it('detectDuplicates — offline, pure function', () => {
    const dups = detectDuplicates({ last_name: 'Chez Paul', phone: '0612345678' }, EXISTING_CLIENTS);
    expect(dups).toHaveLength(1);
  });

  it('sanitizeClientForDb rejette les colonnes interdites', () => {
    const r = sanitizeClientForDb({ ...VALID_CLIENT_PAYLOAD, city: 'Paris' });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as any).city).toBeUndefined();
  });
});
