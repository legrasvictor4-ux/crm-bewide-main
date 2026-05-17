import { useState, useEffect, useRef, useCallback } from 'react';

export type VisibilityState = 'visible' | 'hidden' | 'prerender';

export type AppVisibilityInfo = {
  visibility: VisibilityState;
  wasHidden: boolean;
  lastHiddenAt: number | null;
  lastVisibleAt: number | null;
  hiddenDurationMs: number;
};

export function useAppVisibility(): AppVisibilityInfo {
  const [visibility, setVisibility] = useState<VisibilityState>(
    document.visibilityState as VisibilityState
  );
  const wasHiddenRef = useRef(false);
  const lastHiddenRef = useRef<number | null>(null);
  const lastVisibleRef = useRef<number | null>(null);

  const handleVisibility = useCallback(() => {
    const state = document.visibilityState as VisibilityState;
    setVisibility(state);

    if (state === 'hidden') {
      wasHiddenRef.current = true;
      lastHiddenRef.current = Date.now();
    } else if (state === 'visible') {
      lastVisibleRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', () => {
      lastVisibleRef.current = Date.now();
      setVisibility('visible');
    });
    window.addEventListener('blur', () => {
      lastHiddenRef.current = Date.now();
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleVisibility]);

  const hiddenDurationMs =
    lastHiddenRef.current && lastVisibleRef.current
      ? lastVisibleRef.current - lastHiddenRef.current
      : 0;

  return {
    visibility,
    wasHidden: wasHiddenRef.current,
    lastHiddenAt: lastHiddenRef.current,
    lastVisibleAt: lastVisibleRef.current,
    hiddenDurationMs: hiddenDurationMs > 0 ? hiddenDurationMs : 0,
  };
}
