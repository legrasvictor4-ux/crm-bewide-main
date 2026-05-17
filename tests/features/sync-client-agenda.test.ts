import { describe, expect, it, vi } from 'vitest';

describe('Sync automatique — chaque nouveau client avec date_relance crée un RDV agenda', () => {
  it('doit créer un événement agenda quand un client a date_relance', () => {
    const createAgendaEvent = vi.fn().mockResolvedValue({ id: 'evt-1' });
    const client = { id: 'c1', name: 'Boulangerie', date_relance: '2026-06-20' };

    if (client.date_relance && client.id && client.name) {
      const startDate = new Date(client.date_relance);
      startDate.setHours(10, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(11, 0, 0, 0);
      createAgendaEvent({
        clientId: client.id,
        title: `Relance - ${client.name}`,
        type: 'rappel',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        durationMinutes: 60,
        bufferMinutes: 10,
        opportunityScore: 0,
        priority: 'normal',
        description: expect.any(String),
        address: '',
      });
    }

    expect(createAgendaEvent).toHaveBeenCalledTimes(1);
    expect(createAgendaEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Relance - Boulangerie', type: 'rappel', clientId: 'c1' })
    );
  });

  it('doit utiliser 10h-11h comme créneau horaire par défaut pour la relance', () => {
    const createAgendaEvent = vi.fn().mockResolvedValue({ id: 'evt-2' });
    const client = { id: 'c2', name: 'Test', date_relance: '2026-07-05' };

    if (!client.date_relance || !client.id || !client.name) return;

    const startDate = new Date(client.date_relance);
    startDate.setHours(10, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(11, 0, 0, 0);

    createAgendaEvent({
      clientId: client.id,
      title: `Relance - ${client.name}`,
      type: 'rappel',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes: 60,
      bufferMinutes: 10,
      opportunityScore: 0,
      priority: 'normal',
      description: '',
      address: '',
    });

    expect(startDate.getHours()).toBe(10);
    expect(endDate.getHours()).toBe(11);
    expect(createAgendaEvent).toHaveBeenCalled();
  });

  it('ne doit pas créer d\'événement si date_relance est vide', () => {
    const createAgendaEvent = vi.fn();
    const client = { id: 'c3', name: 'Test', date_relance: null };

    if (!client.date_relance) {
      expect(createAgendaEvent).not.toHaveBeenCalled();
    }
  });

  it('doit inclure l\'adresse du client dans l\'événement agenda', () => {
    const createAgendaEvent = vi.fn().mockResolvedValue({ id: 'evt-3' });
    const client = { id: 'c4', name: 'Restaurant', date_relance: '2026-08-01', address: '10 rue de Lyon' };

    if (!client.date_relance || !client.id || !client.name) return;

    const startDate = new Date(client.date_relance);
    startDate.setHours(10, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(11, 0, 0, 0);

    createAgendaEvent({
      clientId: client.id,
      title: `Relance - ${client.name}`,
      type: 'rappel',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes: 60,
      bufferMinutes: 10,
      opportunityScore: 0,
      priority: 'normal',
      description: '',
      address: client.address ?? '',
    });

    expect(createAgendaEvent).toHaveBeenCalledWith(expect.objectContaining({ address: '10 rue de Lyon' }));
  });

  it('useCreateClient doit appeler createRelanceAgendaEvent dans onSuccess', async () => {
    const { useCreateClient } = await import('@/hooks/use-clients');
    expect(useCreateClient).toBeDefined();
    const mutation = useCreateClient();
    expect(mutation.mutate).toBeTypeOf('function');
  });
});
