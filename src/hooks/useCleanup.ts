import { useEffect, useRef } from "react";

type TimerId = number | ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
type RafId = number;
type ListenerEntry = { target: EventTarget; type: string; handler: EventListener; options?: AddEventListenerOptions };

export function useCleanup() {
  const timers = useRef<Set<TimerId>>(new Set());
  const rafs = useRef<Set<RafId>>(new Set());
  const listeners = useRef<Set<ListenerEntry>>(new Set());
  const subs = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    const timersSnapshot = timers.current;
    const rafsSnapshot = rafs.current;
    const listenersSnapshot = listeners.current;
    const subsSnapshot = subs.current;

    return () => {
      for (const id of timersSnapshot) {
        clearTimeout(id as number);
        clearInterval(id as number);
      }
      timersSnapshot.clear();

      for (const id of rafsSnapshot) {
        cancelAnimationFrame(id);
      }
      rafsSnapshot.clear();

      for (const entry of listenersSnapshot) {
        entry.target.removeEventListener(entry.type, entry.handler, entry.options);
      }
      listenersSnapshot.clear();

      for (const unsub of subsSnapshot) {
        try { unsub(); } catch { /* ignore */ }
      }
      subsSnapshot.clear();
    };
  }, []);

  const safeTimeout = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  };

  const safeInterval = (fn: () => void, ms: number): number => {
    const id = window.setInterval(fn, ms);
    timers.current.add(id);
    return id;
  };

  const safeRaf = (fn: () => void): number => {
    const id = requestAnimationFrame(() => {
      rafs.current.delete(id);
      fn();
    });
    rafs.current.add(id);
    return id;
  };

  const safeListener = (
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void => {
    const entry: ListenerEntry = { target, type, handler, options };
    listeners.current.add(entry);
    target.addEventListener(type, handler, options);
  };

  const addSubscription = (unsubscribe: () => void): void => {
    subs.current.add(unsubscribe);
  };

  return { safeTimeout, safeInterval, safeRaf, safeListener, addSubscription };
}
