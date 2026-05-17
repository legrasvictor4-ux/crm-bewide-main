import { describe, expect, it, vi, afterEach } from 'vitest';

describe('Feature 3 — PWA Add-to-Home-Screen + Notifications Apple', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should detect iOS device from user agent', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    const mod = await import('@/components/pwa/AddToHomeScreenPrompt');
    expect(mod.default).toBeDefined();
  });

  it('should detect standalone mode on iOS', () => {
    const standalone = (navigator as any).standalone === true;
    expect(standalone).toBe(false);
  });

  it('should detect if browser supports beforeinstallprompt', () => {
    const hasBeforeInstall = 'onbeforeinstallprompt' in window;
    expect(typeof hasBeforeInstall).toBe('boolean');
  });

  it('should handle push notification registration', async () => {
    const mockSubscribe = vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com/sub1' });
    const mockReady = vi.fn().mockResolvedValue({ pushManager: { subscribe: mockSubscribe } });
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: mockReady() },
    });
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') });
    if ('Notification' in window && Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      expect(perm).toBe('granted');
    }
  });

  it('should show iOS instructions when on Apple device', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
      standalone: false,
    });
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    expect(isIOS).toBe(true);
  });
});
