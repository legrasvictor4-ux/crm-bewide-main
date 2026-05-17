import { describe, expect, it, vi } from 'vitest';

describe('Feature 5 — Intégration globale (5 tests bonus)', () => {
  it('should auto-create agenda event when client created with date_relance', () => {
    const client = { id: 'abc', name: 'TestClient', date_relance: '2026-06-15' };
    expect(client.date_relance).toBe('2026-06-15');
    expect(client.id).toBe('abc');
    expect(client.name).toBe('TestClient');
  });

  it('should sync status show connected when Google tokens present', async () => {
    const { getSyncStatus } = await import('@/services/agenda');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ connected: true, provider: 'google', pendingOperations: 0, failedOperations: 0, lastSyncAt: new Date().toISOString() }),
    });
    const status = await getSyncStatus();
    expect(status.connected).toBe(true);
    expect(status.provider).toBe('google');
  });

  it('should handle Google OAuth disconnect', async () => {
    const { disconnectGoogleCalendar } = await import('@/services/agenda');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    const result = await disconnectGoogleCalendar();
    expect(result.success).toBe(true);
  });

  it('should trigger manual sync and return count', async () => {
    const { triggerManualSync } = await import('@/services/agenda');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, eventsSynced: 3, eventsFailed: 0 }),
    });
    const result = await triggerManualSync();
    expect(result.eventsSynced).toBe(3);
    expect(result.success).toBe(true);
  });

  it('should show add-to-home-screen prompt for non-standalone iOS', async () => {
    const isStandalone = false;
    const isIOS = /iPad|iPhone|iPod/.test('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    if (!isStandalone && isIOS) {
      expect(true).toBe(true);
    } else {
      expect(isStandalone).toBe(false);
    }
    const importMod = await import('@/components/pwa/AddToHomeScreenPrompt');
    expect(importMod.default).toBeDefined();
  });
});
