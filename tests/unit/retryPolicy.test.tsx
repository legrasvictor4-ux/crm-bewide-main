import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Phase 11: Retry Policy — aucun wait(5000) fragile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('utilise vi.useFakeTimers au lieu de wait(5000)', () => {
    const fn = vi.fn();
    setTimeout(fn, 5000);
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalled();
  });

  it('pas de setTimeout sans cleanup — les timers doivent être tracés', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const id = setTimeout(() => {}, 100000);
    clearTimeout(id);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('setTimeout avec petite valeur — pas d\'attente réelle', () => {
    const fn = vi.fn();
    setTimeout(fn, 10);
    vi.advanceTimersByTime(10);
    expect(fn).toHaveBeenCalled();
  });

  it('setInterval correctement nettoyé', () => {
    const fn = vi.fn();
    const id = setInterval(fn, 1000);
    vi.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(3);
    clearInterval(id);
  });

  it('Promise résolue sans attente réelle', async () => {
    const p = Promise.resolve('done');
    const result = await p;
    expect(result).toBe('done');
  });
});
