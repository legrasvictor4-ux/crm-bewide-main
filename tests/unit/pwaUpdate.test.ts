import { describe, expect, it, vi, afterEach } from 'vitest';

describe('Module 6 — Phase 16: PWA Update Strategy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listens for SW updates and returns cleanup', async () => {
    const { listenForSwUpdates } = await import('@/lib/mobile/pwaUpdate');
    const cleanup = listenForSwUpdates();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('applyPwaUpdate sends SKIP_WAITING message', async () => {
    const { applyPwaUpdate } = await import('@/lib/mobile/pwaUpdate');
    const mockPostMessage = vi.fn();
    const registration = { waiting: { postMessage: mockPostMessage } } as any as ServiceWorkerRegistration;
    applyPwaUpdate(registration);
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('onPwaUpdateAvailable registers listener', async () => {
    const { onPwaUpdateAvailable } = await import('@/lib/mobile/pwaUpdate');
    const callback = vi.fn();
    const unsubscribe = onPwaUpdateAvailable(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
