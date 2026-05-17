import { vi, afterAll, afterEach } from 'vitest';

const ALLOWED_FETCH_PREFIXES = ['blob:', 'data:'];

export function installNetworkBlocker(): void {
  const originalFetch = globalThis.fetch.bind(globalThis);

  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (ALLOWED_FETCH_PREFIXES.some((p) => url.startsWith(p))) {
      return originalFetch(input, init);
    }

    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return originalFetch(input, init);
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const error = new Error(`[NETWORK_BLOCKER] Real network request blocked in test: ${url}`);
      Error.captureStackTrace(error, installNetworkBlocker);
      return Promise.reject(error);
    }

    return originalFetch(input, init);
  });

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['open']>) {
    const method = args[0];
    const url = args[1]?.toString() ?? '';
    if ((url.startsWith('http://') || url.startsWith('https://')) &&
        !url.startsWith('http://localhost') &&
        !url.startsWith('http://127.0.0.1')) {
      throw new Error(`[NETWORK_BLOCKER] Real XHR blocked in test: ${method} ${url}`);
    }
    return originalXHROpen.apply(this, args);
  };
}

export function uninstallNetworkBlocker(): void {
  vi.unstubAllGlobals();
  delete (import.meta as any).env?.VITE_SUPABASE_URL;
}

export function setupNetworkBlocking(): void {
  beforeAll(() => installNetworkBlocker());
  afterAll(() => uninstallNetworkBlocker());
}
