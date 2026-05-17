export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  signal?: AbortSignal;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 15000,
  onRetry: () => {},
  signal: new AbortController().signal,
};

function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, maxDelayMs);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('offline') ||
      msg.includes('timeout') ||
      msg.includes('fetch') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('enotfound')
    );
  }
  return false;
}

export async function retryableFetch(input: RequestInfo, init?: RequestInit & RetryOptions): Promise<Response> {
  const options = { ...DEFAULT_OPTIONS, ...init };
  const { maxRetries, baseDelayMs, maxDelayMs, onRetry, signal } = options;

  let lastError: Error | null = null;

  const cleanInit = { ...init } as Record<string, unknown>;
  delete cleanInit.maxRetries;
  delete cleanInit.baseDelayMs;
  delete cleanInit.maxDelayMs;
  delete cleanInit.onRetry;
  delete cleanInit.signal;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

      const response = await fetch(input, {
        ...cleanInit,
        signal: signal
          ? anySignal([signal, controller.signal])
          : controller.signal,
      } as RequestInit);

      clearTimeout(timeoutId);

      if (response.ok) return response;

      if (attempt < maxRetries && response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        onRetry(attempt, lastError);
        await delay(calculateDelay(attempt, baseDelayMs, maxDelayMs));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout((err as any)?.timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (signal?.aborted) throw err;
        lastError = new Error('Request timeout');
        onRetry(attempt, lastError);
      } else if (isNetworkError(err)) {
        lastError = err as Error;
        onRetry(attempt, lastError);
      } else {
        throw err;
      }

      if (attempt >= maxRetries) break;
      await delay(calculateDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
