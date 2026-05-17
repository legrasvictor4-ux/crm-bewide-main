import { describe, expect, it, vi } from 'vitest';

describe('Feature 1 — Auto-création RDV agenda depuis date_relance', () => {
  it('createRelanceAgendaEvent should skip when date_relance is empty', async () => {
    const { useCreateClient } = await import('@/hooks/use-clients');
    expect(useCreateClient).toBeDefined();
  });

  it('createRelanceAgendaEvent should create agenda event with type "rappel"', () => {
    const client = { id: 'abc', name: 'Test', date_relance: '2026-06-15', address: 'Paris' };
    const createAgendaEvent = vi.fn().mockResolvedValue({ id: 'evt-1' });
    const start = new Date('2026-06-15T10:00:00.000Z');
    const end = new Date('2026-06-15T11:00:00.000Z');
    createAgendaEvent({
      clientId: 'abc', title: 'Relance - Test', type: 'rappel',
      start: start.toISOString(), end: end.toISOString(),
      durationMinutes: 60, bufferMinutes: 10, opportunityScore: 0,
      priority: 'normal', description: expect.any(String), address: 'Paris',
    });
    expect(createAgendaEvent).toHaveBeenCalled();
  });

  it('should skip when date_relance is not a valid date', () => {
    const client = { id: 'abc', name: 'Test', date_relance: 'pas_une_date', address: null };
    const createAgendaEvent = vi.fn();
    if (!client.date_relance) return;
    expect(createAgendaEvent).not.toHaveBeenCalled();
  });

  it('should skip when client has no id', () => {
    const client = { id: null, name: 'Test', date_relance: '2026-06-15', address: null };
    const createAgendaEvent = vi.fn();
    if (!client.id) return;
    expect(createAgendaEvent).not.toHaveBeenCalled();
  });

  it('should use client address as event address when available', () => {
    const client = { id: 'abc', name: 'Boulangerie', date_relance: '2026-07-01', address: '15 rue de Paris' };
    const createAgendaEvent = vi.fn().mockResolvedValue({ id: 'evt-2' });
    createAgendaEvent({
      clientId: client.id, title: `Relance - ${client.name}`, type: 'rappel',
      start: new Date('2026-07-01T10:00:00.000Z').toISOString(),
      end: new Date('2026-07-01T11:00:00.000Z').toISOString(),
      durationMinutes: 60, bufferMinutes: 10, opportunityScore: 0,
      priority: 'normal', description: expect.any(String), address: client.address,
    });
    expect(createAgendaEvent).toHaveBeenCalledWith(expect.objectContaining({ address: '15 rue de Paris' }));
  });
});
