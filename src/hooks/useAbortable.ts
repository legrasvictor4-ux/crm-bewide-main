/**
 * useAbortable.ts — Standard AbortController lifecycle for fetch / API calls
 *
 * Ensures:
 *  - AbortController is created per-component-instance (not shared across renders)
 *  - signal is aborted on unmount
 *  - caller can abort manually
 *  - no zombie requests after unmount
 *
 * Usage:
 *   const { signal, abort, aborted } = useAbortable();
 *   fetch("/api/x", { signal }).then(...)
 */

import { useRef, useEffect, useCallback } from "react";

export interface UseAbortableResult {
  /** Current AbortSignal — changes on each (re)mount */
  signal: AbortSignal;
  /** Manually abort the current signal */
  abort: () => void;
  /** true if the signal has been aborted */
  aborted: boolean;
}

/**
 * create a standard AbortController that is aborted automatically on unmount.
 * Pass `enabled = false` to suppress controller creation (lazy init).
 */
export function useAbortable(enabled = true): UseAbortableResult {
  const ctrlRef = useRef<AbortController | null>(null);
  const abortedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    ctrlRef.current = new AbortController();
    abortedRef.current = false;

    return () => {
      abortedRef.current = true;
      ctrlRef.current?.abort();
      ctrlRef.current = null;
    };
  }, [enabled]);

  const abort = useCallback(() => {
    abortedRef.current = true;
    ctrlRef.current?.abort();
  }, []);

  if (!ctrlRef.current) {
    ctrlRef.current = new AbortController();
  }
  return {
    signal:  ctrlRef.current.signal,
    abort,
    aborted: abortedRef.current,
  };
}

/**
 * useRequestLock — prevents concurrent execution of the same async operation.
 * Returns: { run, isLoading, error, abort }.
 *
 * Usage:
 *   const { run, isLoading } = useRequestLock();
 *   const handleSave = () => run(saveClient(payload));
 */
export interface UseRequestLock<T> {
  run:    (promise: Promise<T>) => Promise<T | undefined>;
  isLoading: boolean;
  error:  Error | null;
  abort:  () => void;
}

export function useRequestLock<T = void>(): UseRequestLock<T> {
  const ctrlRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const errorRef   = useRef<Error | null>(null);

  useEffect(() => () => {
    ctrlRef.current?.abort();
  }, []);

  const run = useCallback((promise: Promise<T>): Promise<T | undefined> => {
    if (loadingRef.current) return Promise.resolve(undefined);
    ctrlRef.current = new AbortController();
    errorRef.current = null;
    loadingRef.current = true;

    return promise
      .then((val) => {
        loadingRef.current = false;
        return val;
      })
      .catch((err: Error) => {
        if ((err as any)?.name === "AbortError") return undefined as any;
        errorRef.current = err;
        return undefined as any;
      });
  }, []);

  const abort = useCallback(() => {
    ctrlRef.current?.abort();
    loadingRef.current = false;
  }, []);

  return { run, isLoading: loadingRef.current, error: errorRef.current, abort };
}

export default useAbortable;
