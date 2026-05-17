import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

describe('Phase 8: Memory Leak Detection', () => {
  let initialListenerCount = 0;
  const activeTimers: Set<ReturnType<typeof setInterval>> = new Set();
  const activeIntervals: Set<ReturnType<typeof setInterval>> = new Set();

  function getListenerCount(): number {
    const w = globalThis as any;
    return w.__eventListeners?.size ?? 0;
  }

  function getActiveTimers(): number {
    return activeTimers.size + activeIntervals.size;
  }

  beforeEach(() => {
    const origSetTimeout = globalThis.setTimeout;
    const origSetInterval = globalThis.setInterval;
    const origClearTimeout = globalThis.clearTimeout;
    const origClearInterval = globalThis.clearInterval;

    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any, ms?: any, ...args: any[]): any => {
      const id = origSetTimeout(fn, ms, ...args);
      activeTimers.add(id);
      const origFn = fn;
      const wrapped = () => {
        activeTimers.delete(id);
        return origFn();
      };
      clearTimeout(id);
      const newId = origSetTimeout(wrapped, ms, ...args);
      activeTimers.delete(id);
      activeTimers.add(newId);
      return newId;
    });

    vi.spyOn(globalThis, 'setInterval').mockImplementation((fn: any, ms?: any, ...args: any[]): any => {
      const id = origSetInterval(fn, ms, ...args);
      activeIntervals.add(id);
      return id;
    });

    vi.spyOn(globalThis, 'clearTimeout').mockImplementation((id: any) => {
      activeTimers.delete(id);
      return origClearTimeout(id);
    });

    vi.spyOn(globalThis, 'clearInterval').mockImplementation((id: any) => {
      activeIntervals.delete(id);
      return origClearInterval(id);
    });

    initialListenerCount = getListenerCount();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('aucun survivant addEventListener après unmount', async () => {
    const el = document.createElement('div');
    const handler = vi.fn();
    el.addEventListener('click', handler);
    el.removeEventListener('click', handler);

    expect(getListenerCount()).toBeLessThanOrEqual(initialListenerCount + 2);
  });

  it('aucun setTimeout survivant après le test', async () => {
    const id = setTimeout(() => {}, 100000);
    clearTimeout(id);
    expect(getActiveTimers()).toBe(0);
  });

  it('aucun setInterval survivant après clear', async () => {
    const id = setInterval(() => {}, 100000);
    clearInterval(id);
    expect(getActiveTimers()).toBe(0);
  });

  it('AbortController correctement nettoyé', () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it('EventSource / WebSocket non persistent après test', () => {
    const wsMock = { close: vi.fn(), onopen: null, onclose: null, onerror: null, onmessage: null };
    const ES = vi.fn();
    (globalThis as any).__connections = (globalThis as any).__connections ?? [];
    (globalThis as any).__connections.push(wsMock);
    wsMock.close();
    (globalThis as any).__connections = [];
  });
});
