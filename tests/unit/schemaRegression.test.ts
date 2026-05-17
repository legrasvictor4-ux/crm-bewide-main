import { describe, expect, it } from 'vitest';
import { ClientSchema } from '@/schema/clientSchema';
import { sanitizeClientForDb } from '@/schema/sanitizeClient';
import { ClientSchemaKeys } from '@/schema/clientSchemaKeys';

const FORBIDDEN_COLUMNS = ['city', 'ville', 'village', 'commune', 'municipalite'];
const FORBIDDEN_PATTERNS = ['.select(\'*\')', 'select(*', 'select("*"'];

describe('Phase 9: Schema Regression Guards', () => {
  it('FORBIDDEN: city ne doit jamais réapparaître dans aucun payload', () => {
    const shape = ClientSchema.shape;
    for (const col of FORBIDDEN_COLUMNS) {
      expect((shape as any)[col]).toBeUndefined();
    }
  });

  it('FORBIDDEN: .select(\'*\') ne doit pas exister dans les fichiers source (vérification compile-time)', () => {
    const src = sanitizeClientForDb.toString();
    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(src).not.toContain(pattern);
    }
  });

  it('FORBIDDEN: spread accidentel = ghost columns éliminées', () => {
    const external = { city: 'Paris', ville: 'Lyon', unknown_flag: true, client_since: '2024-01-01' };
    const result = sanitizeClientForDb({
      ...external,
      last_name: 'Guard Test',
      status: 'prospect',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      for (const col of FORBIDDEN_COLUMNS) {
        expect((result.data as any)[col]).toBeUndefined();
      }
      expect((result.data as any).unknown_flag).toBeUndefined();
      expect((result.data as any).client_since).toBeUndefined();
    }
  });

  it('FORBIDDEN: aucun payload fantôme ne traverse sanitizeClientForDb', () => {
    const phantomPayloads = [
      { last_name: 'T', status: 'prospect', client_since: '2024-01-01' },
      { last_name: 'T', status: 'prospect', primary_contact: 'Jean' },
      { last_name: 'T', status: 'prospect', name: 'Test' },
      { last_name: 'T', status: 'prospect', _raw: { foo: 'bar' } },
      { last_name: 'T', status: 'prospect', tags: ['a', 'b'] },
      { last_name: 'T', status: 'prospect', position: { lat: 1, lng: 2 } },
    ];

    for (const payload of phantomPayloads) {
      const result = sanitizeClientForDb(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const keys = Object.keys(result.data);
        const phantom = keys.filter((k) => !ClientSchemaKeys.includes(k));
        expect(phantom).toEqual([]);
      }
    }
  });

  it('FORBIDDEN: ClientSchemaKeys doit être exactement les clés de ClientSchema', () => {
    const shapeKeys = Object.keys(ClientSchema.shape).sort();
    expect([...ClientSchemaKeys].sort()).toEqual(shapeKeys);
  });

  it('FORBIDDEN: pas de colonne supplémentaire dans ClientSchemaKeys', () => {
    const shapeKeys = Object.keys(ClientSchema.shape);
    const extra = ClientSchemaKeys.filter((k) => !shapeKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it('GUARD: last_name est toujours requis (Zod validation)', () => {
    const result = ClientSchema.safeParse({ status: 'prospect' });
    expect(result.success).toBe(false);
  });

  it('GUARD: status est limité aux valeurs autorisées', () => {
    const result = ClientSchema.safeParse({ last_name: 'Test', status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('GUARD: sanitizeClientForDb normlise chaînes vides en null', () => {
    const result = sanitizeClientForDb({ last_name: 'Test', status: 'prospect', email: '', phone: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });
});
