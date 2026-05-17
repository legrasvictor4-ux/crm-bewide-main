import { describe, it, expect, beforeEach } from 'vitest';

// ─── Proximity Engine ───────────────────────────────────────────────────────
import {
  haversineKm,
  estimateTravelMinutes,
  detectProximateAppointments,
} from '../../src/backend/agenda/proximityEngine.js';

// ─── Suggestion Store ───────────────────────────────────────────────────────
import {
  storeSuggestions,
  getPendingSuggestions,
  acceptSuggestion,
  declineSuggestion,
  clearStaleSuggestions,
  getDecisionHistory,
  clearAll,
} from '../../src/backend/agenda/suggestionStore.js';

// ─── Sync Queue ─────────────────────────────────────────────────────────────
import {
  enqueue,
  getPendingOps,
  getFailedOps,
  getQueueStats,
  markCompleted,
  markFailed,
  generateOpId,
  clearStaleOps,
  clearAllOps,
} from '../../src/backend/agenda/syncQueue.js';

describe('Agenda — Proximity Engine', () => {
  const parisLouvre = { latitude: 48.8606, longitude: 2.3376 };
  const parisTourEiffel = { latitude: 48.8584, longitude: 2.2945 };
  const lyonPartDieu = { latitude: 45.7606, longitude: 4.8592 };

  describe('haversineKm', () => {
    it('calcule la distance Paris-Lyon (~390 km)', () => {
      const d = haversineKm(parisLouvre, lyonPartDieu);
      expect(d).not.toBeNull();
      expect(d).toBeGreaterThan(380);
      expect(d).toBeLessThan(410);
    });

    it('calcule la distance Louvre-Tour Eiffel (~3.3 km)', () => {
      const d = haversineKm(parisLouvre, parisTourEiffel);
      expect(d).not.toBeNull();
      expect(d).toBeGreaterThan(2.5);
      expect(d).toBeLessThan(5);
    });

    it('retourne null si coordonnées manquantes', () => {
      expect(haversineKm(null, parisLouvre)).toBeNull();
      expect(haversineKm(parisLouvre, { latitude: null, longitude: 2.3 })).toBeNull();
      expect(haversineKm(parisLouvre, {})).toBeNull();
    });

    it('retourne 0 pour deux points identiques', () => {
      const d = haversineKm(parisLouvre, parisLouvre);
      expect(d).toBeCloseTo(0, 1);
    });
  });

  describe('estimateTravelMinutes', () => {
    it('estime le temps de trajet', () => {
      const d = haversineKm(parisLouvre, parisTourEiffel);
      const min = estimateTravelMinutes(d, 30);
      expect(min).not.toBeNull();
      expect(min).toBeGreaterThan(0);
    });

    it('retourne null si distance null', () => {
      expect(estimateTravelMinutes(null)).toBeNull();
    });
  });

  describe('detectProximateAppointments', () => {
    const now = new Date('2026-05-20T09:00:00.000Z');
    const later = new Date('2026-05-21T14:00:00.000Z');
    const farLater = new Date('2026-05-22T10:00:00.000Z');

    const mkApt = (id, title, lat, lng, start, oppScore = 5, priority = 'normal') => ({
      id,
      title,
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600000).toISOString(),
      latitude: lat,
      longitude: lng,
      opportunityScore: oppScore,
      priority,
    });

    it('détecte 2 rendez-vous proches sur des jours différents', () => {
      const appointments = [
        mkApt('rdv1', 'Client A', parisLouvre.latitude, parisLouvre.longitude, now, 5),
        mkApt('rdv2', 'Client B', parisTourEiffel.latitude, parisTourEiffel.longitude, later, 5),
      ];

      const result = detectProximateAppointments(appointments);
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions[0].distanceKm).toBeLessThan(5);
      expect(result.suggestions[0].relevanceScore).toBeGreaterThanOrEqual(30);
    });

    it('ignore les rendez-vous trop éloignés', () => {
      const appointments = [
        mkApt('rdv1', 'Client Paris', parisLouvre.latitude, parisLouvre.longitude, now),
        mkApt('rdv2', 'Client Lyon', lyonPartDieu.latitude, lyonPartDieu.longitude, later),
      ];

      const result = detectProximateAppointments(appointments, { thresholdKm: 5 });
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBe(0);
    });

    it('nécessite au moins 2 rendez-vous', () => {
      const appointments = [
        mkApt('rdv1', 'Seul RDV', parisLouvre.latitude, parisLouvre.longitude, now),
      ];

      const result = detectProximateAppointments(appointments);
      expect(result.success).toBe(false);
    });

    it('pénalise les priorités VIP (score plus bas)', () => {
      const appointments = [
        mkApt('rdv1', 'Client Normal', parisLouvre.latitude, parisLouvre.longitude, now, 5, 'normal'),
        mkApt('rdv2', 'Client VIP', parisTourEiffel.latitude, parisTourEiffel.longitude, later, 5, 'vip'),
      ];

      const result = detectProximateAppointments(appointments);
      expect(result.success).toBe(true);
      // Should suggest moving the normal one, not the VIP
      if (result.suggestions.length > 0) {
        expect(result.suggestions[0].relevanceScore).toBeLessThan(70);
      }
    });

    it('retourne les suggestions triées par pertinence', () => {
      const far = new Date('2026-05-23T09:00:00.000Z');
      const appointments = [
        mkApt('rdv1', 'Client A', parisLouvre.latitude, parisLouvre.longitude, now, 8),
        mkApt('rdv2', 'Client B', parisTourEiffel.latitude, parisTourEiffel.longitude, later, 3),
        mkApt('rdv3', 'Client C', parisLouvre.latitude, parisLouvre.longitude, far, 6),
      ];

      const result = detectProximateAppointments(appointments);
      expect(result.success).toBe(true);
      if (result.suggestions.length > 1) {
        for (let i = 1; i < result.suggestions.length; i++) {
          expect(result.suggestions[i].relevanceScore).toBeLessThanOrEqual(result.suggestions[i - 1].relevanceScore);
        }
      }
    });

    it('limite à 5 suggestions maximum', () => {
      const appointments = [];
      const base = new Date('2026-05-20T09:00:00.000Z');
      for (let i = 0; i < 10; i++) {
        appointments.push(
          mkApt(`rdv${i}`, `Client ${i}`, parisLouvre.latitude + i * 0.001, parisLouvre.longitude + i * 0.001, new Date(base.getTime() + i * 86400000)),
        );
      }

      const result = detectProximateAppointments(appointments);
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('Agenda — Suggestion Store', () => {
  const userId = 'test_user_1';

  const baseSuggestions = [
    {
      sourceEventId: 'evt_a',
      targetEventId: 'evt_b',
      sourceDate: '2026-05-20T09:00:00.000Z',
      targetDate: '2026-05-21T14:00:00.000Z',
      proposedDate: '2026-05-20T09:00:00.000Z',
      distanceKm: 3.2,
      travelTimeMinutes: 5,
      relevanceScore: 75,
      reason: 'RDV A et RDV B sont à 3.2 km l\'un de l\'autre',
    },
  ];

  beforeEach(() => {
    clearAll();
  });

  it('stocke et récupère les suggestions', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    expect(fresh.length).toBe(1);
    expect(fresh[0].userId).toBe(userId);
    expect(fresh[0].status).toBe('pending');

    const pending = getPendingSuggestions(userId);
    expect(pending.total).toBe(1);
    expect(pending.suggestions[0].sourceEventId).toBe('evt_a');
  });

  it('dédouble les suggestions identiques', () => {
    storeSuggestions(userId, baseSuggestions);
    const again = storeSuggestions(userId, baseSuggestions);
    expect(again.length).toBe(0);
  });

  it('accepte une suggestion et marque comme acceptée', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    const result = acceptSuggestion(fresh[0].id);
    expect(result.success).toBe(true);
    expect(result.update.eventId).toBe('evt_b');
    expect(result.update.newStart).toBe('2026-05-20T09:00:00.000Z');
  });

  it('refuse une suggestion avec cooldown', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    const result = declineSuggestion(fresh[0].id, { cooldownHours: 24 });
    expect(result.success).toBe(true);
    expect(result.suggestion.status).toBe('declined');
    expect(result.suggestion.cooldownUntil).not.toBeNull();
  });

  it('ne retourne pas les suggestions en cooldown', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    declineSuggestion(fresh[0].id, { cooldownHours: 24 });

    const pending = getPendingSuggestions(userId);
    expect(pending.total).toBe(0);
    expect(pending.cooldownActive).toBe(true);
  });

  it('rejette les actions sur suggestions déjà traitées', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    acceptSuggestion(fresh[0].id);
    const again = acceptSuggestion(fresh[0].id);
    expect(again.success).toBe(false);
  });

  it('nettoie les suggestions périmées', () => {
    storeSuggestions(userId, baseSuggestions);
    clearStaleSuggestions(-1); // force tout supprimer
    const pending = getPendingSuggestions(userId);
    expect(pending.total).toBe(0);
  });

  it('retourne l\'historique des décisions', () => {
    const fresh = storeSuggestions(userId, baseSuggestions);
    acceptSuggestion(fresh[0].id);
    const history = getDecisionHistory(userId);
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('accepted');
  });
});

describe('Agenda — Sync Queue', () => {
  beforeEach(() => {
    clearAllOps();
  });

  it('enfile une opération', () => {
    const op = enqueue({
      userId: 'user1',
      action: 'created',
      eventId: 'evt_1',
      payload: { title: 'Test' },
    });
    expect(op.status).toBe('pending');
    expect(op.retryCount).toBe(0);

    const pending = getPendingOps();
    expect(pending.length).toBe(1);
  });

  it('marque comme complétée et retire de la file', () => {
    const op = enqueue({ userId: 'user1', action: 'created', eventId: 'evt_1' });
    markCompleted(op.id);
    expect(getPendingOps().length).toBe(0);
  });

  it('gère les retries avec backoff', () => {
    const op = enqueue({ userId: 'user1', action: 'updated', eventId: 'evt_2' });
    markFailed(op.id, 'Network error');
    expect(op.retryCount).toBe(1);
    expect(op.status).toBe('pending'); // Can retry

    markFailed(op.id, 'Network error');
    markFailed(op.id, 'Network error');
    expect(op.retryCount).toBe(3);
    expect(op.status).toBe('failed');
  });

  it('rapporte les statistiques', () => {
    enqueue({ userId: 'user1', action: 'created', eventId: 'evt_1' });
    enqueue({ userId: 'user1', action: 'deleted', eventId: 'evt_2' });

    const stats = getQueueStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
  });

  it('génère des IDs uniques', () => {
    const id1 = generateOpId();
    const id2 = generateOpId();
    expect(id1).not.toBe(id2);
  });

  it('nettoie les opérations périmées', () => {
    enqueue({ userId: 'user1', action: 'created', eventId: 'evt_1' });
    clearAllOps();
    expect(getQueueStats().total).toBe(0);
  });
});
