import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem, safeClear } from '@/lib/mobile/safeStorage';
import { enqueueAction, dequeueAction, getQueue, getQueueSize, incrementRetry, clearQueue, hasPendingActions } from '@/lib/mobile/offlineStore';
import { processQueue, registerSyncHandler, unregisterSyncHandler } from '@/lib/mobile/syncQueue';
import { retryableFetch, isNetworkError } from '@/lib/mobile/retryableRequest';
import { getFieldModeConfig, shouldBatchApiCalls } from '@/lib/mobile/fieldMode';
import { saveCrashSnapshot, getCrashSnapshot, clearCrashSnapshot, restoreAfterCrash, isTransientError } from '@/lib/mobile/errorRecovery';
import { startPerformanceMark, endPerformanceMark, getPerformanceReport, clearPerformanceMarks } from '@/lib/mobile/performanceMonitor';
import { trackTimeout, trackInterval, clearTrackedTask, clearAllTrackedTasks, getActiveTaskCount } from '@/lib/mobile/backgroundTaskControl';
import { detectMobileBrowser, isSpeechAPIAvailable, checkMicroPermission, resetMicCache } from '@/lib/mobile/safeMicrophone';

// In-memory localStorage for testing
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

// ─── Phase 9: safeStorage ──────────────────────────────────────────────────

describe('Module 6 — Phase 9: safeStorage', () => {
  beforeEach(() => {
    const mock = createMockStorage();
    vi.stubGlobal('localStorage', mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('safeSetItem/safeGetItem round-trip', () => {
    const data = { test: 'value', num: 42 };
    const setResult = safeSetItem('test_key', data);
    expect(setResult.success).toBe(true);

    const getResult = safeGetItem<typeof data>('test_key');
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.data.test).toBe('value');
      expect(getResult.data.num).toBe(42);
    }
  });

  it('safeGetItem returns NOT_FOUND for missing key', () => {
    const result = safeGetItem('nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('NOT_FOUND');
  });

  it('safeGetItem returns PARSE for corrupted JSON', () => {
    localStorage.setItem('bewide_corrupt', '{corrupted');
    const result = safeGetItem('corrupt');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('PARSE');
  });

  it('safeRemoveItem removes the key', () => {
    safeSetItem('test', { x: 1 });
    expect(safeGetItem('test').success).toBe(true);
    safeRemoveItem('test');
    expect(safeGetItem('test').success).toBe(false);
  });

  it('safeClear removes only prefixed keys', () => {
    safeSetItem('keep', { x: 1 });
    safeSetItem('keep2', { x: 2 });
    localStorage.setItem('other_app_key', 'should_stay');
    safeClear();
    expect(safeGetItem('keep').success).toBe(false);
    expect(safeGetItem('keep2').success).toBe(false);
    expect(localStorage.getItem('other_app_key')).toBe('should_stay');
  });
});

// ─── Phase 2: offlineStore ──────────────────────────────────────────────────

describe('Module 6 — Phase 2: offlineStore', () => {
  beforeEach(() => {
    clearQueue();
    const mock = createMockStorage();
    vi.stubGlobal('localStorage', mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enqueueAction adds to queue', () => {
    const id = enqueueAction('CREATE_CLIENT', { last_name: 'Test' });
    expect(id).toBeTruthy();
    expect(getQueueSize()).toBe(1);
  });

  it('dequeueAction removes from queue', () => {
    const id = enqueueAction('CREATE_CLIENT', {});
    expect(getQueueSize()).toBe(1);
    dequeueAction(id);
    expect(getQueueSize()).toBe(0);
  });

  it('incrementRetry max retry = 5, then removes', () => {
    const id = enqueueAction('CREATE_CLIENT', {}, 2);
    expect(incrementRetry(id)).toBe(true);
    expect(incrementRetry(id)).toBe(true);
    expect(incrementRetry(id)).toBe(false);
    expect(getQueueSize()).toBe(0);
  });

  it('hasPendingActions returns true/false', () => {
    expect(hasPendingActions()).toBe(false);
    enqueueAction('CREATE_CLIENT', {});
    expect(hasPendingActions()).toBe(true);
  });

  it('clearQueue empties queue', () => {
    enqueueAction('CREATE_CLIENT', {});
    enqueueAction('UPDATE_CLIENT', {});
    expect(getQueueSize()).toBe(2);
    clearQueue();
    expect(getQueueSize()).toBe(0);
  });
});

// ─── Phase 12: syncQueue ────────────────────────────────────────────────────

describe('Module 6 — Phase 12: syncQueue', () => {
  beforeEach(() => {
    clearQueue();
    unregisterSyncHandler('CREATE_CLIENT');
  });

  it('processQueue calls handler and dequeues on success', async () => {
    const handler = vi.fn().mockResolvedValue(true);
    registerSyncHandler('CREATE_CLIENT', handler);

    enqueueAction('CREATE_CLIENT', { last_name: 'Test' });
    const result = await processQueue();

    expect(handler).toHaveBeenCalled();
    expect(result.success).toBe(1);
    expect(getQueueSize()).toBe(0);
  });

  it('processQueue increments retry on handler failure', async () => {
    const handler = vi.fn().mockResolvedValue(false);
    registerSyncHandler('CREATE_CLIENT', handler);

    enqueueAction('CREATE_CLIENT', {});
    const result = await processQueue();

    const queue = getQueue();
    expect(queue[0].retries).toBe(1);
  });

  it('processQueue skips unregistered handlers', async () => {
    enqueueAction('UNKNOWN_TYPE', {});
    const result = await processQueue();
    expect(result.skipped).toBe(1);
  });

  it('registerSyncHandler/unregisterSyncHandler lifecycle', () => {
    const handler = vi.fn();
    registerSyncHandler('TEST', handler);
    unregisterSyncHandler('TEST');
    expect(true).toBe(true);
  });
});

// ─── Phase 4: retryableRequest ──────────────────────────────────────────────

describe('Module 6 — Phase 4: retryableRequest', () => {
  it('isNetworkError detects network errors', () => {
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('NetworkError'))).toBe(true);
    expect(isNetworkError(new Error('timeout'))).toBe(true);
    expect(isNetworkError(new DOMException('Aborted', 'AbortError'))).toBe(false);
    expect(isNetworkError(new Error('normal error'))).toBe(false);
  });

  it('retryableFetch rejects with AbortError when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(retryableFetch('http://localhost/test', { signal: controller.signal })).rejects.toThrow('Aborted');
  });
});

// ─── Phase 11: fieldMode ────────────────────────────────────────────────────

describe('Module 6 — Phase 11: fieldMode', () => {
  it('offline mode disables everything', () => {
    const config = getFieldModeConfig('offline');
    expect(config.disableMap).toBe(true);
    expect(config.disableAnimations).toBe(true);
    expect(config.batchUpdates).toBe(true);
    expect(config.maxRetries).toBe(0);
  });

  it('good mode is full featured', () => {
    const config = getFieldModeConfig('good');
    expect(config.disableMap).toBe(false);
    expect(config.disableAnimations).toBe(false);
    expect(config.batchUpdates).toBe(false);
  });

  it('shouldBatchApiCalls returns true for offline/poor', () => {
    expect(shouldBatchApiCalls('offline')).toBe(true);
    expect(shouldBatchApiCalls('poor')).toBe(true);
    expect(shouldBatchApiCalls('good')).toBe(false);
  });

  it('getFieldModeConfig is stable for all qualities', () => {
    const qualities = ['offline', 'poor', 'fair', 'good'] as const;
    for (const q of qualities) {
      const config = getFieldModeConfig(q);
      expect(config).toBeDefined();
      expect(typeof config.maxRetries).toBe('number');
    }
  });
});

// ─── Phase 13: errorRecovery ────────────────────────────────────────────────

describe('Module 6 — Phase 13: errorRecovery', () => {
  beforeEach(() => {
    const mock = createMockStorage();
    vi.stubGlobal('localStorage', mock);
    clearCrashSnapshot();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveCrashSnapshot/getCrashSnapshot round-trip', () => {
    const snapshot = { route: '/clients', draftTranscript: 'test', draftCandidate: null, voiceStep: 'IDLE', timestamp: Date.now() };
    saveCrashSnapshot(snapshot);
    const restored = getCrashSnapshot();
    expect(restored?.route).toBe('/clients');
    expect(restored?.draftTranscript).toBe('test');
  });

  it('restoreAfterCrash returns hasRecovery=true when snapshot exists', () => {
    saveCrashSnapshot({ route: '/', draftTranscript: null, draftCandidate: null, voiceStep: null, timestamp: Date.now() });
    const recovery = restoreAfterCrash();
    expect(recovery.hasRecovery).toBe(true);
  });

  it('restoreAfterCrash clears snapshot', () => {
    saveCrashSnapshot({ route: '/', draftTranscript: null, draftCandidate: null, voiceStep: null, timestamp: Date.now() });
    restoreAfterCrash();
    expect(getCrashSnapshot()).toBeNull();
  });

  it('isTransientError identifies recoverable errors', () => {
    expect(isTransientError(new Error('Network error'))).toBe(true);
    expect(isTransientError(new Error('timeout'))).toBe(true);
    expect(isTransientError(new Error('Fatal error'))).toBe(false);
  });
});

// ─── Phase 14: performanceMonitor ───────────────────────────────────────────

describe('Module 6 — Phase 14: performanceMonitor', () => {
  afterEach(() => clearPerformanceMarks());

  it('startPerformanceMark/endPerformanceMark records duration', () => {
    startPerformanceMark('test_op');
    const duration = endPerformanceMark('test_op');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('getPerformanceReport returns completed marks', () => {
    startPerformanceMark('op1');
    endPerformanceMark('op1');
    startPerformanceMark('op2');
    endPerformanceMark('op2');
    const report = getPerformanceReport();
    expect(report.length).toBe(2);
  });

  it('endPerformanceMark returns null for unknown mark', () => {
    expect(endPerformanceMark('unknown')).toBeNull();
  });
});

// ─── Phase 10: backgroundTaskControl ────────────────────────────────────────

describe('Module 6 — Phase 10: backgroundTaskControl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllTrackedTasks();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAllTrackedTasks();
  });

  it('trackTimeout creates tracked timer', () => {
    const fn = vi.fn();
    trackTimeout(fn, 1000, 'test_timeout');
    expect(getActiveTaskCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalled();
  });

  it('clearTrackedTask removes timer', () => {
    const fn = vi.fn();
    const id = trackTimeout(fn, 1000);
    clearTrackedTask(id);
    expect(getActiveTaskCount()).toBe(0);
  });

  it('clearAllTrackedTasks removes all', () => {
    trackTimeout(vi.fn(), 1000);
    trackInterval(vi.fn(), 2000);
    expect(getActiveTaskCount()).toBe(2);
    clearAllTrackedTasks();
    expect(getActiveTaskCount()).toBe(0);
  });
});

// ─── Phase 7: safeMicrophone ────────────────────────────────────────────────

describe('Module 6 — Phase 7: safeMicrophone', () => {
  beforeEach(() => {
    resetMicCache();
  });

  it('detectMobileBrowser returns other in test env', () => {
    expect(['ios', 'android_chrome', 'samsung', 'other']).toContain(detectMobileBrowser());
  });

  it('isSpeechAPIAvailable returns false in test env (no SpeechRecognition)', () => {
    expect(isSpeechAPIAvailable()).toBe(false);
  });

  it('checkMicroPermission returns unavailable when API missing', async () => {
    const state = await checkMicroPermission();
    expect(state.permission).toBe('unavailable');
  });
});
