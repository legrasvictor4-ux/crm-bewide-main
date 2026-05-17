import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";

type Cleanup = void | (() => void);

type SafeEffectCallback = (mounted: { current: boolean }) => Cleanup;

export function useSafeEffect(effect: SafeEffectCallback, deps?: DependencyList): void {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const cleanup = effect(mounted);

    return () => {
      mounted.current = false;
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useIsMounted(): { current: boolean } {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
