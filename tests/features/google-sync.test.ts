import { describe, expect, it, vi, beforeAll } from 'vitest';

describe('Feature 2 — Synchronisation Google Agenda', () => {
  it('should return OAuth URL when GOOGLE_CLIENT_ID is set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    const { connectGoogleCalendar } = await import('@/services/agenda');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=test-client-id' }),
    });
    const result = await connectGoogleCalendar();
    expect(result.authUrl).toContain('accounts.google.com');
    expect(result.authUrl).toContain('client_id=test-client-id');
    vi.unstubAllEnvs();
  });

  it('should exchange auth code for tokens', async () => {
    const { exchangeAuthCode } = await import('@/backend/agenda/googleSync.js');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok_abc', refresh_token: 'ref_xyz', expires_in: 3600 }),
    });
    const tokens = await exchangeAuthCode('auth_code_123', 'http://localhost:3000/api/agenda/sync/google/callback');
    expect(tokens.access_token).toBe('tok_abc');
    expect(tokens.refresh_token).toBe('ref_xyz');
    vi.unstubAllEnvs();
  });

  it('should process sync queue and mark completed', async () => {
    const syncQueue = await import('@/backend/agenda/syncQueue.js');
    syncQueue.clearAllOps();
    const op = syncQueue.enqueue({ userId: 'user1', action: 'created', eventId: 'evt1', payload: { title: 'Test' } });
    expect(op.status).toBe('pending');
    syncQueue.markCompleted(op.id);
    const stats = syncQueue.getQueueStats();
    expect(stats.pending).toBe(0);
  });

  it('should retry failed operations with backoff', async () => {
    const syncQueue = await import('@/backend/agenda/syncQueue.js');
    syncQueue.clearAllOps();
    const op = syncQueue.enqueue({ userId: 'user1', action: 'updated', eventId: 'evt2', googleEventId: 'gcal_1' });
    syncQueue.markFailed(op.id, 'Network error');
    expect(syncQueue.getFailedOps()).toHaveLength(0);
    expect(syncQueue.getPendingOps()).toHaveLength(1);
    syncQueue.markFailed(op.id, 'Network error');
    syncQueue.markFailed(op.id, 'Network error');
    expect(syncQueue.getFailedOps()).toHaveLength(1);
  });

  it('should create event via Google Calendar API helper', async () => {
    const gsync = await import('@/backend/agenda/googleSync.js');
    const eventData = { title: 'RDV Test', start: '2026-06-01T10:00:00Z', end: '2026-06-01T11:00:00Z', location: 'Paris' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'gcal_evt_1', summary: 'RDV Test' }),
    });
    gsync.setUserTokens('user1', { access_token: 'tok', refresh_token: 'ref', expires_in: 99999 });
    try { await gsync.createEvent('user1', eventData); } catch {}
    expect(global.fetch).toHaveBeenCalled();
  });
});
