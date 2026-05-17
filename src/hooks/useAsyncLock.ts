import { useCallback, useRef } from "react";
import { useIsMounted } from "./useSafeEffect";

export type AsyncLock = {
  isLocked: () => boolean;
  acquire: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  release: () => void;
};

export function useAsyncLock(): AsyncLock {
  const lockedRef = useRef(false);
  const mounted = useIsMounted();

  const isLocked = useCallback(() => lockedRef.current, []);

  const release = useCallback(() => {
    lockedRef.current = false;
  }, []);

  const acquire = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (lockedRef.current) return undefined;
      lockedRef.current = true;
      try {
        const result = await fn();
        return result;
      } finally {
        if (mounted.current) {
          lockedRef.current = false;
        }
      }
    },
    [mounted],
  );

  return { isLocked, acquire, release };
}

export function useDoubleSubmitGuard(): {
  guard: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  isPending: boolean;
} {
  const lockedRef = useRef(false);
  const mounted = useIsMounted();

  const guard = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (lockedRef.current) return undefined;
      lockedRef.current = true;
      try {
        return await fn();
      } finally {
        if (mounted.current) {
          lockedRef.current = false;
        }
      }
    },
    [mounted],
  );

  return { guard, isPending: lockedRef.current };
}
