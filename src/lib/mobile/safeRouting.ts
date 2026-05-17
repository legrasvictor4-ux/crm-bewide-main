import { useEffect, useRef, useCallback } from 'react';

type RouteGuard = {
  condition: () => boolean;
  onBlock: () => void;
  message: string;
};

const guards: RouteGuard[] = [];

export function registerRouteGuard(guard: RouteGuard): () => void {
  guards.push(guard);
  return () => {
    const idx = guards.indexOf(guard);
    if (idx >= 0) guards.splice(idx, 1);
  };
}

export function checkRouteGuards(): RouteGuard | null {
  for (const guard of guards) {
    if (guard.condition()) return guard;
  }
  return null;
}

export function useNavigationGuard(enabled: boolean, message: string): {
  guard: () => boolean;
  unblock: () => void;
} {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const guard = useCallback((): boolean => {
    if (!enabledRef.current) return true;

    const answer = window.confirm(message);
    return answer;
  }, [message]);

  useEffect(() => {
    if (!enabled) return;

    const unregister = registerRouteGuard({
      condition: () => enabledRef.current,
      onBlock: () => {},
      message,
    });

    return unregister;
  }, [enabled, message]);

  return { guard, unblock: () => {} };
}

export function useBackNavigationPrevention(active: boolean): void {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    const handler = (e: PopStateEvent) => {
      if (activeRef.current) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);

    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, [active]);
}
